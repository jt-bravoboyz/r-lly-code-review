# Universal Messaging Overhaul

Goal: One premium glass chat experience used by every messaging surface in R@lly — Rally chats, Squad chats, and any future DMs. Shared component, shared data layer, shared real-time pipeline.

## Surfaces to Migrate (every chat in app)

Found via search:
- **Rally chat** — `src/components/chat/EventChat.tsx` (used in `EventDetail.tsx`)
- **Squad chat** — `src/components/chat/SquadChatSheet.tsx` → `ChatView.tsx` (used in `Chat.tsx` + `SquadDetail.tsx`)
- **General `ChatView.tsx`** — currently only consumed by SquadChatSheet, but the EventChat reimplements the same UI with drift

After this overhaul there will be **one** chat renderer: `UnifiedChat`. `EventChat` and `ChatView` become thin adapters (or get deleted) that hand props to it. No other chat surfaces exist today (DMs are not yet built — but the component will accept `chatType: 'dm'` so it's drop-in ready).

## New Component Architecture

```
src/components/chat/unified/
  UnifiedChat.tsx           // top-level: messages list + input + typing + empty state
  MessageList.tsx           // grouping, timestamp dividers, read-receipt placement, IntersectionObserver
  MessageBubble.tsx         // glass bubble, tail logic, reactions row, long-press handler, image render
  MessageBubbleGroup.tsx    // helper for sender-grouped clusters (avatar on last only)
  ReactionBar.tsx           // floating long-press emoji picker (glass)
  ReactionBadges.tsx        // stacked reaction count badges + viewer popover
  TypingIndicator.tsx       // 3 orange bouncing dots in glass bubble
  ReadReceiptAvatar.tsx     // 16-18px avatar attached at last-read message
  ChatInputBar.tsx          // camera | gallery | input | mic | send (glass dock, breathing glow)
  VoiceDictationButton.tsx  // Web Speech API wrapper, pulsing orange when active
  ImageLightbox.tsx         // pinch-zoom + swipe-dismiss fullscreen viewer
  TimestampDivider.tsx      // centered "Today 9:42 PM" with hairlines
  useMessageReactions.ts    // load + toggle reactions for chatId
  useMessageReads.ts        // mark-read + subscribe to read receipts
  useTypingChannel.ts       // wraps existing typing_indicator:chat-{id} broadcast
```

`UnifiedChat` props:
```ts
type ChatType = 'rally' | 'squad' | 'dm';
interface UnifiedChatProps {
  chatId: string;
  chatType: ChatType;
  messages: Message[];
  isLoading: boolean;
  storagePath: string;        // existing chat-images path convention
  contextBanner?: ReactNode;  // e.g. EventChat's "R@lly is live" banner
}
```

The existing `useEventChat` / `useSquadChat` hooks stay as the data layer — they already expose `{ chat, messages, isLoading }`. The wrappers just feed them into `<UnifiedChat />`.

### Migration

- `EventChat.tsx` → becomes a 20-line wrapper: pulls `useEventChat(eventId)`, renders `<UnifiedChat chatType="rally" contextBanner={phaseBanner} ... />`. Old inline UI deleted.
- `SquadChatSheet.tsx` → keeps the Sheet shell + header, swaps `<ChatView>` for `<UnifiedChat chatType="squad" ... />`.
- `ChatView.tsx` → deleted (or kept as a `chatType="squad"` shim if anything else imports it; search confirms only SquadChatSheet does).

## Visual & Interaction Spec (built into MessageBubble + ChatInputBar)

### Bubbles
- Border radius 20px; tail corner 6px on the side closest to avatar
- Grouping: track `prevSenderId` and `nextSenderId` while mapping messages → flags `isFirstInGroup` / `isLastInGroup` → controls tail rounding + avatar visibility
- Sender name (small muted) renders only above `isFirstInGroup` for non-own messages in group chats
- Avatar (32px) renders only on `isLastInGroup` for non-own messages
- Max-width 75%
- Entry animation: framer-motion-free CSS — `@keyframes bubble-in { from { transform: scale(.85); opacity:0 } to { transform: scale(1); opacity:1 } }` 250ms cubic-bezier(.34,1.36,.64,1)
- Sent confirm shimmer: 800ms orange border-glow keyframe added to a class toggled when message id is fresh

### Glass tints
- Own: `bg-[rgba(244,122,25,0.18)] backdrop-blur-md border border-[rgba(244,122,25,0.35)] text-white`
- Other (dark): `bg-white/[0.08] backdrop-blur-md border border-white/10`
- Other (light): `bg-black/[0.05] backdrop-blur-md border border-black/10`

### Timestamps
- Render `<TimestampDivider>` between two messages when `gap >= 30 * 60_000ms` using date-fns relative formatting
- Per-message exact time appears via long-press: same long-press handler that opens reaction bar also schedules a 2s fade-out timestamp tooltip beside the bubble

### Input Bar
- Sticky bottom dock, glass, 20px backdrop blur, top shadow, 1px border, breathing 4s orange border-glow keyframe
- Slots: Camera (uses `<input type="file" accept="image/*" capture="environment">`), Gallery (`accept="image/*"`), auto-grow `<textarea>` (1→5 lines via `rows` calc on input), Mic (`VoiceDictationButton`), Send
- Send hides while empty; mic icon fills its position
- Photo preview thumbnail with X above textarea while attached
- Slides with keyboard: rely on existing `100dvh` + `safe-area-inset-bottom` patterns (per Cross-Platform Hardening memory)

### Voice-to-Text
- Detect `window.SpeechRecognition || window.webkitSpeechRecognition`; if missing, hide mic icon
- `continuous: true, interimResults: true, lang: navigator.language`
- Live append interim transcript into textarea state; commit final on result
- Auto-stop on 2s silence (reset timer on each `onresult`)
- Active state: replace mic with pulsing orange dot + "Listening…" placeholder
- Permission denied → toast: "Mic access required for voice input."

### Reactions
- Long-press (500ms) on bubble → portal-rendered `ReactionBar` floats above bubble (positioned via `getBoundingClientRect`)
- 6 emojis: ❤️ 😂 😮 😢 🔥 👍
- Tap → optimistic toggle, write to `message_reactions`, animate emoji into bubble corner
- Stacked badges below bubble; tap badge → popover with reactor avatars + names

### Typing Indicator
- Reuse existing `typing_indicator:chat-{chatId}` Supabase broadcast channel (already in ChatView)
- New `<TypingIndicator>` renders inside message list (not input bar), with avatar + 3 orange bouncing dots
- Multi-user copy: "Sko is typing…" / "Sko and Jay are typing…" / "Sko and 2 others are typing…"

### Read Receipts
- IntersectionObserver on each rendered message; once visible ≥1s, call `markRead(messageId)`
- Broadcast read event on `read_receipts:chat-{chatId}` channel (ephemeral) AND persist to `message_reads`
- For each other participant, find their highest-read message → render their 16px avatar at that bubble's bottom-right

### Image messages
- Bubble fills with image; rounded glass border kept
- Tap → `ImageLightbox` (fullscreen portal, pinch-zoom via CSS `touch-action: pinch-zoom`, swipe-down to dismiss)
- Progressive: render with `loading="lazy"` and a CSS blur-up placeholder until `onLoad`
- Caption renders below image inside same bubble

### Empty State
- Centered muted "Start the conversation." with a small breathing orange dot above

### Theme
- All glass classes use `dark:` variants; verified palette per memory (#F47A19, hsl(27 91% 53%))

## Database Changes

Two new tables (schema-only migration; no data changes to existing `messages`):

```sql
-- message_reactions
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, profile_id, emoji)
);
create index on public.message_reactions(message_id);
alter table public.message_reactions enable row level security;

-- Reuse is_chat_member(chatId) helper via join
create policy "Chat members can view reactions"
  on public.message_reactions for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and is_chat_member(m.chat_id)));

create policy "Chat members can add own reactions"
  on public.message_reactions for insert to authenticated
  with check (
    profile_id = current_profile_id()
    and exists (select 1 from messages m where m.id = message_id and is_chat_member(m.chat_id))
  );

create policy "Users can remove own reactions"
  on public.message_reactions for delete to authenticated
  using (profile_id = current_profile_id());

alter publication supabase_realtime add table public.message_reactions;

-- message_reads
create table public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, profile_id)
);
create index on public.message_reads(message_id);
alter table public.message_reads enable row level security;

create policy "Chat members can view reads"
  on public.message_reads for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and is_chat_member(m.chat_id)));

create policy "Users can insert own reads"
  on public.message_reads for insert to authenticated
  with check (
    profile_id = current_profile_id()
    and exists (select 1 from messages m where m.id = message_id and is_chat_member(m.chat_id))
  );

alter publication supabase_realtime add table public.message_reads;
```

Both tables work for ALL chat types since `messages.chat_id` is universal across rally + squad chats today.

## Real-Time

- Reuse existing `chat-{id}` postgres_changes subscription for new messages (already in `useChat`)
- Add postgres_changes subscriptions for `message_reactions` and `message_reads` filtered by message ids in current view
- Reuse the existing `typing_indicator:chat-{chatId}` broadcast channel (no DB writes)

## Out-of-Scope Guarantees

- No edits to: Dress Code, Song Rec's, alerts dedup, R@lly Feed placeholder, Uber/Lyft buttons (`RideshareDeepLinkButtons`), bottom nav, profile, settings, or any non-chat surface
- No edits to `useChat.tsx` data fetching beyond optionally re-exporting types
- No changes to `messages` table schema
- No changes to `Chat.tsx` page chrome (just confirms SquadChatSheet still mounts UnifiedChat inside)

## Acceptance Test Pass List

1. Rally chat in `EventDetail` Chat tab → glass bubbles, grouping, camera/gallery/mic/send all work, reactions persist, typing + read receipts live update
2. Squad chat in `Chat.tsx` and `SquadDetail.tsx` via `SquadChatSheet` → identical UI + features
3. Light + dark mode both look premium on both surfaces
4. Existing message threads load with no data loss
5. Dress Code, Song Rec's, Uber/Lyft buttons, R@lly Feed placeholder, bottom nav, etc. all unchanged
