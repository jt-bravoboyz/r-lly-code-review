export interface ScannedItem {
  name: string;
  price: number; // dollars
}

export interface ScannedReceipt {
  items: ScannedItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface ScanCompletePayload {
  // Items the user selected, in cents — matches RequestPaymentDialog item shape
  items: { description: string; quantity: number; unit_price_cents: number }[];
  subtotal_cents: number;
  tax_cents: number;
  tip_cents: number;
}
