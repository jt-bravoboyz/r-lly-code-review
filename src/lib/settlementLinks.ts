export type SettlementMethod = 'venmo' | 'cashapp' | 'paypal';

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
  }
}

export function getMethodLabel(method: SettlementMethod): string {
  return { venmo: 'Venmo', cashapp: 'CashApp', paypal: 'PayPal' }[method];
}
