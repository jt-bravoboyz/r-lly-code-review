import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Check, Users, ArrowLeft, Receipt } from 'lucide-react';
import { useRallyFriends } from '@/hooks/useRallyFriends';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewSplitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function NewSplitSheet({ open, onOpenChange, onCreated }: NewSplitSheetProps) {
  const { profile } = useAuth();
  const { data: friends = [], isLoading } = useRallyFriends();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const totalCents = useMemo(() => {
    const v = parseFloat(amount);
    if (!isFinite(v) || v <= 0) return 0;
    return Math.round(v * 100);
  }, [amount]);

  const perPersonCents = useMemo(() => {
    if (!totalCents || selected.size === 0) return 0;
    return Math.floor(totalCents / (selected.size + 1));
  }, [totalCents, selected.size]);

  const selectedFriends = useMemo(
    () => friends.filter((f) => selected.has(f.id)),
    [friends, selected]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.display_name || '').toLowerCase().includes(q));
  }, [friends, query]);

  const reset = () => {
    setStep(1);
    setTitle('');
    setAmount('');
    setQuery('');
    setSelected(new Set());
    setSubmitting(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canContinue =
    title.trim().length > 0 && totalCents > 0 && selected.size > 0;

  const handleSubmit = async () => {
    if (!profile?.id || !canContinue) return;
    setSubmitting(true);
    try {
      const { data: req, error: reqErr } = await supabase
        .from('split_check_requests')
        .insert({
          event_id: null,
          host_id: profile.id,
          title: title.trim(),
          total_cents: totalCents,
          subtotal_cents: totalCents,
          tax_cents: 0,
          tip_cents: 0,
          per_share_cents: perPersonCents,
          mode: 'even',
          context: 'standalone',
          status: 'open',
        })
        .select('id')
        .single();
      if (reqErr) throw reqErr;

      const rows = Array.from(selected).map((pid) => ({
        request_id: req.id,
        profile_id: pid,
        share_cents: perPersonCents,
        status: 'pending',
      }));
      const { error: tErr } = await supabase.from('split_check_targets').insert(rows);
      if (tErr) throw tErr;

      toast.success(`Split sent to ${selected.size} friend${selected.size === 1 ? '' : 's'}`);
      handleOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message || 'Could not create split');
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/20 bg-background/95 backdrop-blur-2xl p-0 max-h-[90dvh] flex flex-col"
        style={{ WebkitBackdropFilter: 'blur(28px)' }}
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2 font-montserrat">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 -ml-1 rounded-full hover:bg-white/[0.06]"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Receipt className="h-5 w-5 text-primary" />
            {step === 1 ? 'New Split' : 'Confirm Split'}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            {step === 1
              ? 'Split a tab evenly with your crew — no event required.'
              : 'Review and send out the requests.'}
          </p>
        </SheetHeader>

        {step === 1 ? (
          <>
            <div className="px-5 pt-4 pb-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-montserrat">
                  What's this for?
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dinner at Taco Mac"
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-montserrat">
                  Total amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground font-montserrat">
                  Split with
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {selected.size} selected
                </span>
              </div>

              {selectedFriends.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedFriends.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => toggle(f.id)}
                      className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-primary/15 border border-primary/30"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={f.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {f.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-semibold">{f.display_name || 'Friend'}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search friends…"
                  className="pl-9 h-11 rounded-full bg-card/70"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-1">
              <div className="space-y-1 py-1 pb-2">
                {isLoading ? (
                  <p className="text-center text-sm text-muted-foreground py-6">Loading friends…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    {query ? 'No matches.' : 'No friends yet.'}
                  </p>
                ) : (
                  filtered.map((friend) => {
                    const isSel = selected.has(friend.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggle(friend.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 min-w-0 rounded-2xl hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <Avatar className="h-9 w-9 shrink-0 ring-1 ring-primary/20">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/15 text-primary font-bold text-xs">
                            {friend.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <p className="flex-1 font-bold text-sm truncate font-montserrat">
                          {friend.display_name || 'R@lly Member'}
                        </p>
                        <div
                          className={cn(
                            'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                            isSel
                              ? 'bg-primary border-primary'
                              : 'border-white/20'
                          )}
                        >
                          {isSel && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="px-5 py-3 border-t border-white/10 bg-background/80 backdrop-blur-xl space-y-2">
              {selected.size > 0 && totalCents > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Each person owes{' '}
                  <span className="font-bold text-foreground tabular-nums">
                    ${(perPersonCents / 100).toFixed(2)}
                  </span>
                  {' '}· {selected.size + 1} people total
                </p>
              )}
              <Button
                disabled={!canContinue}
                onClick={() => setStep(2)}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-wider font-montserrat shadow-[0_0_20px_rgba(244,122,25,0.4)]"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="px-5 py-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-card/60 p-4 space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold font-montserrat">
                      For
                    </p>
                    <p className="text-base font-bold font-montserrat">{title.trim()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold font-montserrat">
                        Total
                      </p>
                      <p className="text-xl font-extrabold font-montserrat tabular-nums">
                        ${(totalCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold font-montserrat">
                        Per person
                      </p>
                      <p className="text-xl font-extrabold text-primary font-montserrat tabular-nums">
                        ${(perPersonCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold font-montserrat">
                      Splitting with {selected.size}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {selectedFriends.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/[0.03]">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={f.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {f.display_name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm font-semibold truncate">
                          {f.display_name || 'R@lly Member'}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          ${(perPersonCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="px-5 py-3 border-t border-white/10 bg-background/80 backdrop-blur-xl">
              <Button
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground font-black uppercase tracking-wider font-montserrat shadow-[0_0_20px_rgba(244,122,25,0.4)]"
              >
                {submitting ? 'Sending…' : 'Send Split Requests'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
