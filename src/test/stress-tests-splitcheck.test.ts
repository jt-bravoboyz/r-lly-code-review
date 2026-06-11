import { describe, it, expect } from 'vitest';
import {
  methodRequiresManualSend,
  type SettlementMethod,
} from '@/lib/settlementLinks';

/**
 * Stress tests for Split Check + Tab Pay logic.
 * Pure-logic inlines extracted from SplitCheckHome and TabPaySheet —
 * no RTL, no Supabase mocks, no component mounting.
 */

// ─── Inlined SplitCheckHome helpers ────────────────────────────────────────
type TargetStatus = 'pending' | 'settled' | 'paid' | 'disputed';
type P2PStatus = 'sent' | 'confirmed' | 'disputed' | null | undefined;

interface BadgeShape {
  tone: 'green' | 'blue' | 'amber' | 'red' | 'muted';
  label: string;
}

function statusBadge(status: TargetStatus, p2pStatus: P2PStatus): BadgeShape {
  if (p2pStatus === 'confirmed') return { tone: 'green', label: 'Confirmed ✓' };
  if (p2pStatus === 'sent') return { tone: 'blue', label: 'Sent · Confirming' };
  if (status === 'paid') return { tone: 'green', label: 'Confirmed ✓' };
  if (status === 'settled') return { tone: 'blue', label: 'Sent · Confirming' };
  if (status === 'disputed' || p2pStatus === 'disputed')
    return { tone: 'red', label: 'Disputed' };
  return { tone: 'amber', label: 'Pending' };
}

interface OweRow {
  shareCents: number;
  status: TargetStatus;
  p2pStatus: P2PStatus;
}

function totalOweCents(rows: OweRow[]): number {
  return rows
    .filter((r) => r.p2pStatus !== 'confirmed' && r.status !== 'paid')
    .reduce((sum, r) => sum + r.shareCents, 0);
}

function routePay(hasHandles: boolean): 'tabPayOpen' | 'cardOpen' {
  return hasHandles ? 'tabPayOpen' : 'cardOpen';
}

// ─── Inlined TabPaySheet helpers ───────────────────────────────────────────
interface PayeeProfile {
  venmo_handle: string | null;
  cashapp_handle: string | null;
  paypal_handle: string | null;
  apple_cash_handle: string | null;
  preferred_settlement: SettlementMethod | 'card' | null;
}

const METHODS: SettlementMethod[] = ['venmo', 'cashapp', 'paypal', 'apple_cash'];

function handleFor(p: PayeeProfile, m: SettlementMethod): string | null {
  const raw =
    m === 'venmo' ? p.venmo_handle
      : m === 'cashapp' ? p.cashapp_handle
      : m === 'paypal' ? p.paypal_handle
      : p.apple_cash_handle;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function availableMethods(p: PayeeProfile): SettlementMethod[] {
  return METHODS.filter((m) => !!handleFor(p, m));
}

function orderedMethods(p: PayeeProfile): SettlementMethod[] {
  const pref = p.preferred_settlement;
  if (pref && pref !== 'card') {
    return [pref, ...METHODS.filter((m) => m !== pref)];
  }
  return METHODS;
}

// Mirrors TabPaySheet.handleConfirmYes / handleConfirmNo state transitions.
interface SettlementRow {
  status: 'pending' | 'link_opened' | 'sent' | 'confirmed' | 'disputed';
  marked_sent_at: string | null;
  app_returned_at: string | null;
  auto_confirm_at: string | null;
}
interface TargetRow {
  status: TargetStatus;
}

function applyConfirmYes(
  settlement: SettlementRow,
  target: TargetRow,
  now = new Date('2026-06-11T12:00:00Z'),
): { settlement: SettlementRow; target: TargetRow } {
  const iso = now.toISOString();
  const autoIso = new Date(now.getTime() + 86400000).toISOString();
  return {
    settlement: {
      ...settlement,
      status: 'sent',
      marked_sent_at: iso,
      app_returned_at: iso,
      auto_confirm_at: autoIso,
    },
    target: { ...target, status: 'settled' },
  };
}

function applyConfirmNo(
  settlement: SettlementRow,
  now = new Date('2026-06-11T12:00:00Z'),
): SettlementRow {
  return {
    ...settlement,
    status: 'pending',
    app_returned_at: now.toISOString(),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('SplitCheckHome · statusBadge', () => {
  it('p2pStatus=confirmed → green Confirmed ✓', () => {
    expect(statusBadge('pending', 'confirmed')).toEqual({ tone: 'green', label: 'Confirmed ✓' });
    expect(statusBadge('settled', 'confirmed')).toEqual({ tone: 'green', label: 'Confirmed ✓' });
  });
  it('p2pStatus=sent → blue Sent · Confirming', () => {
    expect(statusBadge('pending', 'sent')).toEqual({ tone: 'blue', label: 'Sent · Confirming' });
  });
  it('status=paid (no p2p) → green Confirmed ✓', () => {
    expect(statusBadge('paid', null)).toEqual({ tone: 'green', label: 'Confirmed ✓' });
  });
  it('status=settled (no p2p) → blue Sent · Confirming', () => {
    expect(statusBadge('settled', null)).toEqual({ tone: 'blue', label: 'Sent · Confirming' });
  });
  it('status=pending, no p2p → amber Pending', () => {
    expect(statusBadge('pending', null)).toEqual({ tone: 'amber', label: 'Pending' });
    expect(statusBadge('pending', undefined)).toEqual({ tone: 'amber', label: 'Pending' });
  });
  it('p2p confirmed beats status=paid (still green)', () => {
    expect(statusBadge('paid', 'confirmed').tone).toBe('green');
  });
});

describe('SplitCheckHome · totalOweCents', () => {
  it('sums only rows that are neither confirmed nor paid', () => {
    const rows: OweRow[] = [
      { shareCents: 1000, status: 'pending', p2pStatus: null },
      { shareCents: 2500, status: 'settled', p2pStatus: 'sent' },
      { shareCents: 999, status: 'paid', p2pStatus: null },           // excluded
      { shareCents: 700, status: 'pending', p2pStatus: 'confirmed' }, // excluded
    ];
    expect(totalOweCents(rows)).toBe(3500);
  });
  it('returns 0 when every row is settled+confirmed', () => {
    expect(
      totalOweCents([
        { shareCents: 500, status: 'paid', p2pStatus: null },
        { shareCents: 500, status: 'pending', p2pStatus: 'confirmed' },
      ]),
    ).toBe(0);
  });
  it('returns 0 on empty input', () => {
    expect(totalOweCents([])).toBe(0);
  });
});

describe('SplitCheckHome · handlePay routing', () => {
  it('hasHandles=true → opens tabPayOpen', () => {
    expect(routePay(true)).toBe('tabPayOpen');
  });
  it('hasHandles=false → opens cardOpen', () => {
    expect(routePay(false)).toBe('cardOpen');
  });
});

describe('TabPaySheet · method availability', () => {
  it('only venmo set → venmo is the only available method', () => {
    const payee: PayeeProfile = {
      venmo_handle: '@nightowl',
      cashapp_handle: null,
      paypal_handle: null,
      apple_cash_handle: null,
      preferred_settlement: null,
    };
    expect(availableMethods(payee)).toEqual(['venmo']);
    expect(handleFor(payee, 'venmo')).toBe('@nightowl');
    expect(handleFor(payee, 'cashapp')).toBeNull();
    expect(handleFor(payee, 'paypal')).toBeNull();
    expect(handleFor(payee, 'apple_cash')).toBeNull();
  });
  it('whitespace-only handles are treated as missing', () => {
    const payee: PayeeProfile = {
      venmo_handle: '   ',
      cashapp_handle: '$rallymvp',
      paypal_handle: null,
      apple_cash_handle: null,
      preferred_settlement: null,
    };
    expect(availableMethods(payee)).toEqual(['cashapp']);
  });
});

describe('TabPaySheet · preferred method ordering', () => {
  it('preferred=cashapp → cashapp is first', () => {
    const payee: PayeeProfile = {
      venmo_handle: '@v',
      cashapp_handle: '$c',
      paypal_handle: 'p',
      apple_cash_handle: '+15551234567',
      preferred_settlement: 'cashapp',
    };
    expect(orderedMethods(payee)[0]).toBe('cashapp');
    expect(orderedMethods(payee)).toEqual(['cashapp', 'venmo', 'paypal', 'apple_cash']);
  });
  it('no preference → canonical order', () => {
    const payee: PayeeProfile = {
      venmo_handle: '@v', cashapp_handle: null,
      paypal_handle: null, apple_cash_handle: null,
      preferred_settlement: null,
    };
    expect(orderedMethods(payee)).toEqual(METHODS);
  });
  it('preference=card → canonical order (card is not a method)', () => {
    const payee: PayeeProfile = {
      venmo_handle: '@v', cashapp_handle: null,
      paypal_handle: null, apple_cash_handle: null,
      preferred_settlement: 'card',
    };
    expect(orderedMethods(payee)).toEqual(METHODS);
  });
});

describe('TabPaySheet · methodRequiresManualSend', () => {
  it('apple_cash requires manual send', () => {
    expect(methodRequiresManualSend('apple_cash')).toBe(true);
  });
  it('venmo/cashapp/paypal do not', () => {
    expect(methodRequiresManualSend('venmo')).toBe(false);
    expect(methodRequiresManualSend('cashapp')).toBe(false);
    expect(methodRequiresManualSend('paypal')).toBe(false);
  });
});

describe('TabPaySheet · settlement state transitions', () => {
  const baseSettlement: SettlementRow = {
    status: 'link_opened',
    marked_sent_at: null,
    app_returned_at: null,
    auto_confirm_at: null,
  };
  const baseTarget: TargetRow = { status: 'pending' };

  it('"Yes I sent it" → settlement=sent + target=settled + 24h auto_confirm', () => {
    const now = new Date('2026-06-11T12:00:00Z');
    const { settlement, target } = applyConfirmYes(baseSettlement, baseTarget, now);
    expect(settlement.status).toBe('sent');
    expect(settlement.marked_sent_at).toBe(now.toISOString());
    expect(settlement.app_returned_at).toBe(now.toISOString());
    expect(settlement.auto_confirm_at).toBe(
      new Date(now.getTime() + 86400000).toISOString(),
    );
    expect(target.status).toBe('settled');
  });

  it('"I didn\'t send it" → settlement back to pending, target untouched', () => {
    const now = new Date('2026-06-11T12:00:00Z');
    const opened: SettlementRow = { ...baseSettlement, status: 'link_opened' };
    const reset = applyConfirmNo(opened, now);
    expect(reset.status).toBe('pending');
    expect(reset.app_returned_at).toBe(now.toISOString());
    expect(reset.marked_sent_at).toBeNull();
    expect(reset.auto_confirm_at).toBeNull();
  });
});
