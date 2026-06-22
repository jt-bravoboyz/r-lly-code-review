import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, Receipt, Plus, Wallet, X, Sparkles, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TabPaySheet } from '@/components/payments/TabPaySheet';
import { PaySplitShareDialog } from '@/components/payments/PaySplitShareDialog';
import { SettlementConfirmCard } from '@/components/payments/SettlementConfirmCard';
import { StartTabDialog } from '@/components/payments/StartTabDialog';
import { SetupHandlesSheet } from '@/components/payments/SetupHandlesSheet';
import { SplitCheckSettlementPanel } from '@/components/events/SplitCheckSettlementPanel';
import { ClaimItemsView } from '@/components/payments/ClaimItemsView';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTabSettlements, type TabSettlement } from '@/hooks/useTabSettlements';

const HANDLES_BANNER_DISMISSED_KEY = 'rally-handles-banner-dismissed';

interface OwedRow {
  targetId: string;
  requestId: string;
  eventId: string | null;
  eventTitle: string;
  shareCents: number;
  status: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  hasHandles: boolean;
  p2pStatus: string | null;
}

function fmtUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusBadge(target: OwedRow) {
  if (target.p2pStatus === 'confirmed' || target.status === 'paid') {
    return <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Confirmed ✓</Badge>;
  }
  if (target.p2pStatus === 'sent' || target.status === 'settled') {
    return <Badge className="bg-blue-500/15 text-blue-600 border border-blue-500/30">Sent · Confirming</Badge>;
  }
  return <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30">Pending</Badge>;
}

export default function SplitCheckHome() {
  const { profile } = useAuth();
  const meId = profile?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [owe, setOwe] = useState<OwedRow[]>([]);
  const [owedRequests, setOwedRequests] = useState<any[]>([]);

  const [payTarget, setPayTarget] = useState<OwedRow | null>(null);
  const [tabPayOpen, setTabPayOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [startTabOpen, setStartTabOpen] = useState(false);
  const [setupHandlesOpen, setSetupHandlesOpen] = useState(false);

  // Track current user's own payment handles (for banner + FAB gate)
  const [hasMyHandle, setHasMyHandle] = useState<boolean | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(HANDLES_BANNER_DISMISSED_KEY) === '1';
  });
  const [bannerMounted, setBannerMounted] = useState(false);

  const refetchMyHandles = async () => {
    if (!meId) return;
    const { data } = await supabase
      .from('profiles')
      .select('venmo_handle, cashapp_handle, paypal_handle, apple_cash_handle')
      .eq('id', meId)
      .maybeSingle();
    const any = !!(
      data?.venmo_handle ||
      data?.cashapp_handle ||
      data?.paypal_handle ||
      (data as any)?.apple_cash_handle
    );
    setHasMyHandle(any);
  };

  useEffect(() => {
    refetchMyHandles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  // Trigger banner enter animation on first render
  useEffect(() => {
    const id = requestAnimationFrame(() => setBannerMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dismissBanner = () => {
    try {
      window.localStorage.setItem(HANDLES_BANNER_DISMISSED_KEY, '1');
    } catch {}
    setBannerDismissed(true);
  };

  const showHandlesBanner = hasMyHandle === false && !bannerDismissed;

  const handleNewTab = () => {
    if (hasMyHandle === false) {
      setSetupHandlesOpen(true);
    } else {
      setStartTabOpen(true);
    }
  };

  const handleHandlesComplete = async () => {
    await refetchMyHandles();
    setSetupHandlesOpen(false);
    setStartTabOpen(true);
  };

  const refetch = async () => {
    if (!meId) return;
    setLoading(true);

    // ── YOU OWE ──
    const { data: myTargets } = await supabase
      .from('split_check_targets')
      .select('id, request_id, share_cents, status')
      .eq('profile_id', meId)
      .in('status', ['pending', 'settled']);

    const requestIds = Array.from(new Set((myTargets ?? []).map((t) => t.request_id)));
    let requestsMap = new Map<string, any>();
    let eventsMap = new Map<string, any>();
    let creatorsMap = new Map<string, any>();

    if (requestIds.length) {
      const { data: reqs } = await supabase
        .from('split_check_requests')
        .select('id, event_id, host_id, total_cents, created_at, title')
        .in('id', requestIds);
      requestsMap = new Map((reqs ?? []).map((r) => [r.id, r]));

      const eventIds = Array.from(new Set((reqs ?? []).map((r) => r.event_id).filter(Boolean))) as string[];
      if (eventIds.length) {
        const { data: evs } = await supabase.from('events').select('id, title').in('id', eventIds);
        eventsMap = new Map((evs ?? []).map((e) => [e.id, e]));
      }

      const creatorIds = Array.from(new Set((reqs ?? []).map((r) => r.host_id).filter(Boolean))) as string[];
      if (creatorIds.length) {
        const { data: profs } = await supabase
          .from('safe_profiles')
          .select('id, display_name, avatar_url')
          .in('id', creatorIds);
        creatorsMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
        const handleResults = await Promise.all(
          creatorIds.map((id) =>
            supabase.rpc('get_payment_handles_for_settlement', { _target_profile_id: id })
              .then(({ data }) => ({ id, row: Array.isArray(data) && data.length ? data[0] : null }))
          )
        );
        for (const { id, row } of handleResults) {
          if (!row) continue;
          const prev = creatorsMap.get(id) ?? {};
          creatorsMap.set(id, { ...prev, ...row });
        }
      }
    }

    // P2P settlements where I am payer (for "You Owe" status)
    const targetIds = (myTargets ?? []).map((t) => t.id);
    let p2pByTarget = new Map<string, string>();
    if (targetIds.length) {
      const { data: settles } = await supabase
        .from('tab_settlements')
        .select('split_target_id, status, created_at')
        .in('split_target_id', targetIds)
        .order('created_at', { ascending: false });
      for (const s of settles ?? []) {
        if (s.split_target_id && !p2pByTarget.has(s.split_target_id)) {
          p2pByTarget.set(s.split_target_id, s.status);
        }
      }
    }

    const oweRows: OwedRow[] = (myTargets ?? []).map((t) => {
      const req = requestsMap.get(t.request_id);
      const creator = creatorsMap.get(req?.host_id);
      const ev = req?.event_id ? eventsMap.get(req.event_id) : null;
      return {
        targetId: t.id,
        requestId: t.request_id,
        eventId: req?.event_id ?? null,
        eventTitle: ev?.title ?? req?.title ?? 'R@lly Tab',
        shareCents: t.share_cents ?? 0,
        status: t.status,
        creatorId: req?.host_id ?? '',
        creatorName: creator?.display_name ?? 'Someone',
        creatorAvatar: creator?.avatar_url ?? null,
        hasHandles: !!(creator?.venmo_handle || creator?.cashapp_handle || creator?.paypal_handle || creator?.apple_cash_handle),
        p2pStatus: p2pByTarget.get(t.id) ?? null,
      };
    });
    setOwe(oweRows);

    // ── OWED TO YOU ──
    const { data: myReqs } = await supabase
      .from('split_check_requests')
      .select('id, event_id, host_id, total_cents, created_at, status, mode, title, tax_cents, tip_cents, receipt_image_url')
      .eq('host_id', meId)
      .order('created_at', { ascending: false });

    const myReqIds = (myReqs ?? []).map((r) => r.id);
    let owedTargets: any[] = [];
    let owedSettlements: any[] = [];
    let owedEvents = new Map<string, any>();
    let payerProfiles = new Map<string, any>();
    if (myReqIds.length) {
      const { data: ts } = await supabase
        .from('split_check_targets')
        .select('id, request_id, profile_id, share_cents, status')
        .in('request_id', myReqIds);
      owedTargets = ts ?? [];

      const { data: ss } = await supabase
        .from('tab_settlements')
        .select('*')
        .in('split_request_id', myReqIds)
        .order('created_at', { ascending: false });
      owedSettlements = ss ?? [];

      const evIds = Array.from(new Set((myReqs ?? []).map((r) => r.event_id).filter(Boolean))) as string[];
      if (evIds.length) {
        const { data: evs } = await supabase.from('events').select('id, title, start_time').in('id', evIds);
        owedEvents = new Map((evs ?? []).map((e) => [e.id, e]));
      }
      const payerIds = Array.from(
        new Set([
          ...owedTargets.map((t) => t.profile_id),
          ...owedSettlements.map((s) => s.payer_id),
        ].filter(Boolean))
      );
      if (payerIds.length) {
        const { data: ps } = await supabase.from('safe_profiles').select('id, display_name, avatar_url').in('id', payerIds);
        payerProfiles = new Map((ps ?? []).map((p: any) => [p.id, p]));
      }
    }

    const owedReqs = (myReqs ?? []).map((r) => {
      const ts = owedTargets.filter((t) => t.request_id === r.id);
      const ss = owedSettlements.filter((s) => s.split_request_id === r.id);
      const settlementByTarget = new Map<string, any>();
      for (const s of ss) {
        if (s.split_target_id && !settlementByTarget.has(s.split_target_id)) {
          settlementByTarget.set(s.split_target_id, s);
        }
      }
      const collectableTargets = ts.filter((t) => t.profile_id !== r.host_id);
      const enrichedTargets = collectableTargets.map((t) => ({
        ...t,
        payer: payerProfiles.get(t.profile_id),
        p2p: settlementByTarget.get(t.id) ?? null,
      }));
      const collected = collectableTargets
        .filter((t) => t.status === 'paid' || (settlementByTarget.get(t.id)?.status === 'confirmed'))
        .reduce((s, t) => s + (t.share_cents ?? 0), 0);
      const owedTotal = collectableTargets.reduce((s, t) => s + (t.share_cents ?? 0), 0);
      const pending = Math.max(0, owedTotal - collected);
      const event = r.event_id ? owedEvents.get(r.event_id) : null;
      const sentToMe = ss.filter((s) => s.status === 'sent').map((s) => ({
        ...s,
        payer: payerProfiles.get(s.payer_id) ?? null,
      })) as TabSettlement[];
      return {
        ...r,
        eventTitle: event?.title ?? r.title ?? 'R@lly Tab',
        startTime: event?.start_time ?? r.created_at,
        targets: enrichedTargets,
        owedTotalCents: owedTotal,
        collectedCents: collected,
        pendingCents: pending,
        sentToMe,
      };
    });
    setOwedRequests(owedReqs);
    setLoading(false);
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  // Live updates when a target I owe changes (paid / settled / confirmed)
  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`split-targets-${meId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'split_check_targets', filter: `profile_id=eq.${meId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tab_settlements', filter: `payer_id=eq.${meId}` },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'split_check_requests', filter: `host_id=eq.${meId}` },
        () => refetch()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);


  const totalOwe = useMemo(
    () => owe.filter((r) => r.p2pStatus !== 'confirmed' && r.status !== 'paid')
      .reduce((s, r) => s + r.shareCents, 0),
    [owe]
  );
  const totalOwed = useMemo(
    () => owedRequests.reduce((s, r) => s + (r.pendingCents ?? 0), 0),
    [owedRequests]
  );

  const handlePay = (row: OwedRow) => {
    setPayTarget(row);
    if (row.hasHandles) setTabPayOpen(true);
    else setCardOpen(true);
  };

  return (
    <div className="relative min-h-[100dvh] bg-background pb-bottom-nav">
      <Header />
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Page header with summary banner */}
        <div className="rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl px-5 py-4"
          style={{ WebkitBackdropFilter: 'blur(20px)' }}>
          <h1 className="text-2xl font-extrabold font-montserrat tracking-tight">
            <span className="inline-flex items-baseline gap-0 whitespace-nowrap" style={{ letterSpacing: 0, wordSpacing: 0 }}>
              <span>R</span><span className="text-primary">@</span><span>lly</span>
            </span>{' '}
            Tab
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-montserrat font-semibold">You Owe</p>
              <p className="text-lg font-black font-montserrat tabular-nums text-amber-500">{fmtUSD(totalOwe)}</p>
            </div>
            <div className="flex-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-emerald-500/80 font-montserrat font-semibold">Owed to You</p>
              <p className="text-lg font-black font-montserrat tabular-nums text-emerald-500">{fmtUSD(totalOwed)}</p>
            </div>
          </div>
        </div>

        {showHandlesBanner && (
          <div
            className="relative rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 ease-out"
            style={{
              WebkitBackdropFilter: 'blur(20px)',
              opacity: bannerMounted ? 1 : 0,
              transform: bannerMounted ? 'translateY(0)' : 'translateY(-8px)',
            }}
          >
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-semibold font-montserrat truncate">
                Add a payment handle so friends can pay you back
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Venmo, CashApp, PayPal, or Apple Cash
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSetupHandlesOpen(true)}
              className="text-primary font-montserrat font-semibold text-sm px-2 py-2 shrink-0"
            >
              Set Up
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Dismiss"
              className="absolute -top-2 -right-2 h-11 w-11 flex items-center justify-center"
            >
              <span className="h-7 w-7 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-sm">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </button>
          </div>
        )}

        <Tabs defaultValue="owe" className="w-full">
          <TabsList className="grid grid-cols-2 w-full bg-card/60 border border-white/10 rounded-xl">
            <TabsTrigger value="owe" className="rounded-lg font-montserrat font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(244,122,25,0.4)]">You Owe</TabsTrigger>
            <TabsTrigger value="owed" className="rounded-lg font-montserrat font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_12px_rgba(244,122,25,0.4)]">Owed to You</TabsTrigger>
          </TabsList>

          <TabsContent value="owe" className="space-y-2 mt-4">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : owe.length === 0 ? (
              <div className="rounded-2xl bg-card/40 border border-white/10 p-8 text-center">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-sm font-semibold text-foreground">You're all square</p>
                <p className="text-xs text-muted-foreground mt-1">No open tabs</p>
              </div>
            ) : (
              owe.map((row) => {
                const isClosed = row.p2pStatus === 'confirmed' || row.status === 'paid';
                const isSent = row.p2pStatus === 'sent' || row.status === 'settled';
                return (
                  <div key={row.targetId}
                    className="rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl p-4 flex items-center gap-3"
                    style={{ WebkitBackdropFilter: 'blur(16px)' }}
                  >
                    <Avatar className="h-11 w-11 ring-1 ring-primary/20 shrink-0">
                      {row.creatorAvatar && <AvatarImage src={row.creatorAvatar} />}
                      <AvatarFallback className="bg-primary/15 text-primary font-bold">
                        {row.creatorName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold font-montserrat truncate">{row.creatorName}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.eventTitle}</p>
                      <div className="mt-1.5">{statusBadge(row)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black font-montserrat tabular-nums">{fmtUSD(row.shareCents)}</p>
                      {!isClosed && !isSent && (
                        <Button size="sm"
                          className="mt-1.5 h-8 px-4 rounded-full text-xs font-black uppercase tracking-wider font-montserrat bg-primary shadow-[0_0_16px_rgba(244,122,25,0.35)] hover:bg-primary/90"
                          onClick={() => handlePay(row)}>
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="owed" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : owedRequests.length === 0 ? (
              <div className="rounded-2xl bg-card/40 border border-white/10 p-8 text-center">
                <p className="text-2xl mb-2">🧾</p>
                <p className="text-sm font-semibold text-foreground">No tabs yet</p>
                <p className="text-xs text-muted-foreground mt-1">Tap "New Tab" to split a check with your crew</p>
              </div>
            ) : (
              owedRequests.map((r) => <OwedRequestCard key={r.id} request={r} onChanged={refetch} />)
            )}
          </TabsContent>
        </Tabs>
      </main>

      {payTarget && meId && (
        <TabPaySheet
          open={tabPayOpen}
          onOpenChange={(o) => { setTabPayOpen(o); if (!o) refetch(); }}
          splitTargetId={payTarget.targetId}
          splitRequestId={payTarget.requestId}
          eventId={payTarget.eventId}
          payeeId={payTarget.creatorId}
          payerId={meId}
          amountCents={payTarget.shareCents}
          eventTitle={payTarget.eventTitle}
          onSettled={() => { setTabPayOpen(false); setPayTarget(null); refetch(); }}
        />
      )}
      {payTarget && meId && (
        <PaySplitShareDialog
          open={cardOpen}
          onOpenChange={(o) => { setCardOpen(o); if (!o) { setPayTarget(null); refetch(); } }}
          requestId={payTarget.requestId}
          profileId={meId}
          onPaid={() => { setCardOpen(false); setPayTarget(null); refetch(); }}
        />
      )}


      <button
        onClick={handleNewTab}
        aria-label="New tab"
        className="fixed right-5 z-40 h-14 pl-3 pr-5 rounded-full bg-primary text-primary-foreground font-bold font-montserrat text-sm shadow-[0_10px_30px_rgba(244,122,25,0.45)] flex items-center gap-2 active:scale-95 transition-transform"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <span className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
          <Plus className="h-5 w-5 text-white" strokeWidth={3} />
        </span>
        New Tab
      </button>

      <StartTabDialog
        open={startTabOpen}
        onOpenChange={setStartTabOpen}
        onCreated={() => { refetch(); setStartTabOpen(false); }}
      />

      <SetupHandlesSheet
        open={setupHandlesOpen}
        onOpenChange={setSetupHandlesOpen}
        onComplete={handleHandlesComplete}
      />


      <BottomNav />
    </div>
  );
}

function OwedRequestCard({ request: r, onChanged }: { request: any; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const { profile } = useAuth();
  const { confirmSettlement, disputeSettlement } = useTabSettlements(r.id);
  const date = r.startTime ? new Date(r.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const isItemized = r.mode === 'itemized';

  const [items, setItems] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    if (!isItemized) return;
    let cancelled = false;
    const load = async () => {
      const { data: it } = await supabase.from('split_check_items').select('id, unit_price_cents, quantity').eq('request_id', r.id);
      if (cancelled) return;
      const itemList = it ?? [];
      setItems(itemList);
      const ids = itemList.map((x: any) => x.id);
      if (!ids.length) { setClaims([]); return; }
      const { data: cls } = await supabase.from('split_check_item_claims').select('item_id, profile_id, quantity_claimed').in('item_id', ids);
      if (!cancelled) setClaims(cls ?? []);
    };
    load();
    const ch = supabase.channel(`owed-claims-${r.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_item_claims' }, () => { load(); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [isItemized, r.id]);


  const { grandSubtotalC, claimedSubtotalC, unclaimedSubtotalC, perPersonClaimedC } = useMemo(() => {
    let grand = 0;
    let claimed = 0;
    const perPerson: Record<string, number> = {};
    items.forEach((it: any) => {
      const lineTotal = it.unit_price_cents * it.quantity;
      grand += lineTotal;
      const rows = claims.filter((c: any) => c.item_id === it.id);
      const totalClaimed = rows.reduce((s: number, c: any) => s + c.quantity_claimed, 0);
      if (totalClaimed > 0 && it.quantity > 0) {
        const coveredQty = Math.min(totalClaimed, it.quantity);
        claimed += Math.round(lineTotal * (coveredQty / it.quantity));
        rows.forEach((c: any) => {
          perPerson[c.profile_id] = (perPerson[c.profile_id] ?? 0) + Math.round(lineTotal * (c.quantity_claimed / totalClaimed));
        });
      }
    });
    return { grandSubtotalC: grand, claimedSubtotalC: claimed, unclaimedSubtotalC: Math.max(0, grand - claimed), perPersonClaimedC: perPerson };
  }, [items, claims]);

  return (
    <div className="rounded-2xl bg-card/60 border border-white/10 backdrop-blur-xl p-4 space-y-3"
      style={{ WebkitBackdropFilter: 'blur(16px)' }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full text-left flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(244,122,25,0.2)]">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold font-montserrat truncate">{r.eventTitle}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-black font-montserrat tabular-nums">{fmtUSD(r.owedTotalCents ?? 0)}</p>
            {isItemized && grandSubtotalC > 0 ? (
              <>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                    {fmtUSD(claimedSubtotalC)} claimed
                  </span>
                  {unclaimedSubtotalC === 0 ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold">
                      <Check className="h-2.5 w-2.5" /> All in
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                      {fmtUSD(unclaimedSubtotalC)} unclaimed
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {fmtUSD(r.collectedCents)} in · {fmtUSD(r.pendingCents)} open
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {fmtUSD(r.collectedCents)} in · {fmtUSD(r.pendingCents)} open
              </p>
            )}
          </div>

          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-2">
          {isItemized && grandSubtotalC > 0 && (
            <div className="rounded-xl bg-muted/30 border border-border/40 px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-semibold mb-1">
                <span>Bill status</span>
                <span className="tabular-nums normal-case tracking-normal text-muted-foreground/80">of {fmtUSD(grandSubtotalC)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Claimed</span>
                <span className={`font-medium tabular-nums ${claimedSubtotalC > 0 ? 'text-primary' : ''}`}>{fmtUSD(claimedSubtotalC)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px] mt-0.5">
                <span className="text-muted-foreground">Unclaimed</span>
                {unclaimedSubtotalC === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-semibold">
                    <Check className="h-3 w-3" /> All claimed
                  </span>
                ) : (
                  <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{fmtUSD(unclaimedSubtotalC)}</span>
                )}
              </div>
            </div>
          )}

          {isItemized && (
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-full h-10 font-semibold border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => setClaimOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Claim your items
            </Button>
          )}

          {r.targets.map((t: any) => {
            const isPaid = t.status === 'paid' || t.p2p?.status === 'confirmed';
            const isSent = t.p2p?.status === 'sent' || t.status === 'settled';
            const isDisputed = t.p2p?.status === 'disputed';
            const claimedC = perPersonClaimedC[t.payer?.id ?? t.profile_id] ?? 0;
            return (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-6 w-6">
                    {t.payer?.avatar_url && <AvatarImage src={t.payer.avatar_url} />}
                    <AvatarFallback className="text-[9px]">
                      {(t.payer?.display_name ?? '?').slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{t.payer?.display_name ?? 'Someone'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isItemized ? (
                    <div className="text-right leading-tight">
                      <div className="text-[11px] tabular-nums text-muted-foreground">
                        <span className="text-[9px] uppercase tracking-wider mr-1">claimed</span>{fmtUSD(claimedC)}
                      </div>
                      {(t.share_cents ?? 0) > 0 && (
                        <div className="text-[11px] tabular-nums text-foreground/80">
                          <span className="text-[9px] uppercase tracking-wider mr-1">owes</span>{fmtUSD(t.share_cents)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs tabular-nums text-muted-foreground">{fmtUSD(t.share_cents ?? 0)}</span>
                  )}
                  {isDisputed ? (
                    <Badge className="text-[10px] bg-red-500/15 text-red-600 border border-red-500/30">Disputed</Badge>
                  ) : isPaid ? (
                    <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">Paid</Badge>
                  ) : isSent ? (
                    <Badge className="text-[10px] bg-blue-500/15 text-blue-600 border border-blue-500/30">Sent</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-600 border border-amber-500/30">Pending</Badge>
                  )}
                </div>
              </div>
            );
          })}


          {r.sentToMe?.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-muted-foreground">
                Waiting for your confirmation
              </p>
              {r.sentToMe.map((s: TabSettlement) => (
                <SettlementConfirmCard
                  key={s.id}
                  settlement={s}
                  onConfirm={async (id) => { await confirmSettlement(id); onChanged(); }}
                  onDispute={async (id, note) => { await disputeSettlement(id, note); onChanged(); }}
                />
              ))}
            </div>
          )}

          {r.event_id && (
            <div className="pt-2 border-t">
              <SplitCheckSettlementPanel eventId={r.event_id} hostProfileId={r.host_id ?? ''} />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {isItemized && profile?.id && (
        <Sheet open={claimOpen} onOpenChange={(o) => { setClaimOpen(o); if (!o) onChanged(); }}>
          <SheetContent
            side="bottom"
            className="p-0 rounded-t-3xl border-t border-border/60 bg-background max-h-[92dvh] flex flex-col"
          >
            <SheetHeader className="px-5 pt-5 pb-2 text-left">
              <SheetTitle className="font-montserrat">Claim your items</SheetTitle>
              <SheetDescription>
                Tap the items you had. Your portion gets locked in so the rest splits right.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <ClaimItemsView
                requestId={r.id}
                profileId={profile.id}
                taxCents={r.tax_cents ?? 0}
                tipCents={r.tip_cents ?? 0}
                receiptImageUrl={r.receipt_image_url ?? null}
                onChange={onChanged}
                onSubmit={() => setClaimOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
