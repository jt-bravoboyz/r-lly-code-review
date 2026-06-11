export type SettlementMethod = 'venmo' | 'cashapp' | 'paypal' | 'apple_cash';

/**
 * Strip a leading "@" or "$" prefix so the value can be safely embedded in URLs.
 */
function cleanHandle(handle: string): string {
  return handle.trim().replace(/^[@$]/, '');
}

export function buildSettlementLink(
  method: SettlementMethod,
  handle: string,
  amountDollars: number,
  note: string
): string {
  const encodedNote = encodeURIComponent(note);
  const amt = amountDollars.toFixed(2);
  const h = encodeURIComponent(cleanHandle(handle));
  switch (method) {
    case 'venmo':
      return `venmo://paycharge?txn=pay&recipients=${h}&amount=${amt}&note=${encodedNote}`;
    case 'cashapp':
      return `https://cash.app/${h}/${amt}`;
    case 'paypal':
      return `https://paypal.me/${h}/${amt}`;
    case 'apple_cash':
      // No deep link pre-fills Apple Cash; we open iMessage to the recipient
      // and the user sends Apple Cash manually from inside Messages.
      return `sms:${h}`;
  }
}

export function getMethodLabel(method: SettlementMethod): string {
  return {
    venmo: 'Venmo',
    cashapp: 'CashApp',
    paypal: 'PayPal',
    apple_cash: 'Apple Cash',
  }[method];
}

/**
 * True when the deep link only opens a destination (no pre-filled amount),
 * so the UI must show a manual-send overlay with copyable amount.
 */
export function methodRequiresManualSend(method: SettlementMethod): boolean {
  return method === 'apple_cash';
}
