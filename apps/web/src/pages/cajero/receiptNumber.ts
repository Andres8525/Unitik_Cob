/** Same numbering as the API receipt: REC-YYYYMMDD-<first 6 chars of the payment id>. */
export function receiptNumberFor(paymentId: string, paidAt: string): string {
  const ymd = new Date(paidAt)
    .toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    .replace(/-/g, '');
  return `REC-${ymd}-${paymentId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}
