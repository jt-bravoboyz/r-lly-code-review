export interface PaymentResult {
  status: 'paid' | 'failed';
  transactionId: string;
}

export function simulatePayment(
  amount: number,
  shouldFail = false
): Promise<PaymentResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (shouldFail) {
        resolve({
          status: 'failed',
          transactionId: '',
        });
      } else {
        resolve({
          status: 'paid',
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        });
      }
    }, 2000);
  });
}
