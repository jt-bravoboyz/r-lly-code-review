import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, ChevronRight, Check, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/layout/BottomNav';
import { StartTabDialog } from '@/components/payments/StartTabDialog';

interface HostedRow {
  id: string;
  title: string;
  total_cents: number;
  status: string;
  created_at: string;
  context: string;
  event_id: string | null;
  collected_cents: number;
  paid_count: number;
  target_count: number;
}

interface OwedRow {
  id: string;
  request_id: string;
  share_cents: number;
  status: string;
  request_title: string;
  request_status: string;
  context: string;
  event_id: string | null;
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SplitCheckHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [hosted, setHosted] = useState<HostedRow[]>([]);
  const [owed, setOwed] = useState<OwedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;

    const load = async () => {
      // Hosted
      const { data: reqs } = await supabase
        .from('split_check_requests')
        .select('id, title, total_cents, status, created_at, context, event_id')
        .eq('host_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const reqIds = (reqs ?? []).map((r) => r.id);
      let payments: any[] = [];
      let targets: any[] = [];
      if (reqIds.length) {
        const [{ data: payData }, { data: tData }, { data: eventTitles }] = await Promise.all([
          supabase.from('payments')
            .select('split_request_id, amount_cents, status')
            .in('split_request_id', reqIds),
          supabase.from('split_check_targets')
            .select('request_id, status').in('request_id', reqIds),
          supabase.from('events').select('id, title').in('id', (reqs ?? []).filter((r) => r.event_id).map((r) => r.event_id)),
        ]);
        payments = payData ?? [];
        targets = tData ?? [];
        const eventTitleMap = new Map((eventTitles ?? []).map((e: any) => [e.id, e.title]));
        const hostedRows: HostedRow[] = (reqs ?? []).map((r) => {
          const reqPayments = payments.filter((p) => p.split_request_id === r.id && p.status === 'paid');
          const reqTargets = targets.filter((t) => t.request_id === r.id);
          const collected = reqPayments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
          const paid = reqTargets.filter((t) => t.status === 'paid').length;
          return {
            ...r,
            title: r.title ?? (r.event_id ? (eventTitleMap.get(r.event_id) as string) ?? 'R@lly tab' : 'R@lly Tab'),
            collected_cents: collected,
            paid_count: paid,
            target_count: reqTargets.length,
          };
        });
        if (mounted) setHosted(hostedRows);
      } else {
        if (mounted) setHosted([]);
      }

      // Owed
      const { data: myTargets } = await supabase
        .from('split_check_targets')
        .select('id, request_id, share_cents, status')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const tReqIds = (myTargets ?? []).map((t) => t.request_id);
      let owedRows: OwedRow[] = [];
      if (tReqIds.length) {
        const { data: tReqs } = await supabase
          .from('split_check_requests')
          .select('id, title, status, context, event_id')
          .in('id', tReqIds);
        const tReqMap = new Map((tReqs ?? []).map((r: any) => [r.id, r]));
        const standaloneEventIds = (tReqs ?? []).filter((r: any) => r.event_id).map((r: any) => r.event_id);
        const { data: tEvents } = standaloneEventIds.length
          ? await supabase.from('events').select('id, title').in('id', standaloneEventIds)
          : { data: [] } as any;
        const eventMap = new Map((tEvents ?? []).map((e: any) => [e.id, e.title]));
        owedRows = (myTargets ?? []).map((t) => {
          const r: any = tReqMap.get(t.request_id) ?? {};
          return {
            id: t.id,
            request_id: t.request_id,
            share_cents: t.share_cents,
            status: t.status,
            request_title: r.title ?? (r.event_id ? eventMap.get(r.event_id) ?? 'R@lly tab' : 'R@lly Tab'),
            request_status: r.status ?? 'open',
            context: r.context ?? 'event',
            event_id: r.event_id ?? null,
          };
        });
      }
      if (mounted) {
        setOwed(owedRows);
        setLoading(false);
      }
    };
    load();

    const ch = supabase
      .channel(`tabs-home-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_targets' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_check_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [profile?.id]);

  const goOpen = (row: HostedRow | OwedRow) => {
    const eventId = 'event_id' in row ? row.event_id : null;
    if (eventId) navigate(`/events/${eventId}`);
    // standalone open: future detail page; for now, do nothing
  };

  return (
    <div className="min-h-screen bg-background pb-32" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight">Tabs</h1>
        </div>
        <Button
          size="sm"
          onClick={() => setStartOpen(true)}
          className="bg-primary text-primary-foreground rounded-full px-4 h-10 font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-1" /> Start a tab
        </Button>
      </header>

      <main className="px-5 pt-6 space-y-8 max-w-2xl mx-auto">
        <Section title="Tabs I've hosted">
          {loading ? (
            <SkeletonCards />
          ) : hosted.length === 0 ? (
            <EmptyState
              title="No tabs yet"
              body="Split your first check — R@lly takes care of the math."
              cta="Start a tab"
              onCta={() => setStartOpen(true)}
            />
          ) : (
            hosted.map((r) => (
              <HostedCard key={r.id} row={r} onOpen={() => goOpen(r)} />
            ))
          )}
        </Section>

        <Section title="Tabs I owe or paid">
          {loading ? (
            <SkeletonCards />
          ) : owed.length === 0 ? (
            <EmptyState
              title="All settled up"
              body="When friends invite you to a tab, it'll show here."
            />
          ) : (
            owed.map((r) => <OwedCard key={r.id} row={r} onOpen={() => goOpen(r)} />)
          )}
        </Section>
      </main>

      <BottomNav />
      <StartTabDialog open={startOpen} onOpenChange={setStartOpen} onCreated={() => setStartOpen(false)} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-bold tracking-[0.15em] uppercase text-primary px-1 mb-3">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function HostedCard({ row, onOpen }: { row: HostedRow; onOpen: () => void }) {
  const settled = row.status === 'settled';
  const pct = row.total_cents > 0 ? Math.min(100, Math.round((row.collected_cents / row.total_cents) * 100)) : 0;
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 px-4 py-3.5 active:scale-[0.99] transition-all"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{row.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {settled ? 'Settled' : `${row.paid_count} of ${row.target_count} paid`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold tabular-nums">
            {formatMoney(row.collected_cents)} <span className="text-muted-foreground font-normal">/ {formatMoney(row.total_cents)}</span>
          </div>
          {settled ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-semibold"><Check className="h-3 w-3" /> Settled</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-semibold"><Clock className="h-3 w-3" /> Open</span>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full transition-all', settled ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

function OwedCard({ row, onOpen }: { row: OwedRow; onOpen: () => void }) {
  const paid = row.status === 'paid';
  const declined = row.status === 'declined';
  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 px-4 py-3.5 flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={cn(
          'h-2 w-2 rounded-full shrink-0',
          paid ? 'bg-emerald-500' : declined ? 'bg-muted-foreground' : 'bg-amber-500 animate-pulse',
        )} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{row.request_title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {paid ? 'Paid' : declined ? 'Declined' : 'Open — tap to pay'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold tabular-nums">{formatMoney(row.share_cents)}</span>
        {paid ? <Check className="h-4 w-4 text-emerald-500" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

function EmptyState({ title, body, cta, onCta }: { title: string; body: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="rounded-2xl bg-card/50 border border-dashed border-border/60 px-5 py-8 text-center">
      <Receipt className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{body}</div>
      {cta && (
        <Button onClick={onCta} variant="outline" size="sm" className="mt-4 rounded-full">
          {cta}
        </Button>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </>
  );
}
