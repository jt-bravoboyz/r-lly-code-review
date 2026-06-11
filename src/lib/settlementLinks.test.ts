import { describe, it, expect } from 'vitest';
import { buildSettlementLink, getMethodLabel } from './settlementLinks';

describe('buildSettlementLink', () => {
  it('builds a Venmo deep link with pay txn, cleaned @handle, amount, and encoded note', () => {
    const url = buildSettlementLink('venmo', '@jordan', 12.5, 'R@lly · Tiki Tuesday');
    expect(url).toBe(
      'venmo://paycharge?txn=pay&recipients=jordan&amount=12.50&note=R%40lly%20%C2%B7%20Tiki%20Tuesday'
    );
  });

  it('builds a CashApp link with $cashtag stripped and amount as path segment', () => {
    const url = buildSettlementLink('cashapp', '$jordan', 7, 'note ignored in path');
    expect(url).toBe('https://cash.app/jordan/7.00');
  });

  it('builds a PayPal.me link with handle as path and 2-decimal amount', () => {
    const url = buildSettlementLink('paypal', 'jordan', 4.2, 'note');
    expect(url).toBe('https://paypal.me/jordan/4.20');
  });

  it('handles whitespace and prefix on the same handle', () => {
    expect(buildSettlementLink('venmo', '  @jordan  ', 1, 'x')).toContain('recipients=jordan');
  });

  it('always formats amount to exactly 2 decimals', () => {
    expect(buildSettlementLink('venmo', 'a', 10, 'n')).toContain('amount=10.00');
    expect(buildSettlementLink('venmo', 'a', 10.1, 'n')).toContain('amount=10.10');
    expect(buildSettlementLink('venmo', 'a', 10.999, 'n')).toContain('amount=11.00');
  });

  it('URI-encodes handle (rare but possible) to avoid breaking the URL', () => {
    const url = buildSettlementLink('cashapp', 'name with space', 5, 'n');
    expect(url).toBe('https://cash.app/name%20with%20space/5.00');
  });
});

describe('getMethodLabel', () => {
  it('returns human labels for each method', () => {
    expect(getMethodLabel('venmo')).toBe('Venmo');
    expect(getMethodLabel('cashapp')).toBe('CashApp');
    expect(getMethodLabel('paypal')).toBe('PayPal');
  });
});
