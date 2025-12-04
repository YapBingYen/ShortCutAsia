export function toCents(input: string): number {
  const cleaned = (input || '').replace(/[^0-9.,]/g, '').replace(',', '.');
  const n = Number(cleaned);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function distributeRemainder(base: number[], total: number): number[] {
  const sum = base.reduce((s, v) => s + v, 0);
  let diff = total - sum;
  const res = [...base];
  const sign = diff >= 0 ? 1 : -1;
  diff = Math.abs(diff);
  let i = 0;
  while (diff > 0) {
    res[i % res.length] += sign;
    diff--;
    i++;
  }
  return res;
}

export function allocateByPercent(total: number, percents: number[]): number[] {
  const raw = percents.map((p) => Math.floor((total * p) / 100));
  return distributeRemainder(raw, total);
}

export function allocateByShares(total: number, shares: number[]): number[] {
  const sumShares = shares.reduce((s, v) => s + v, 0);
  if (sumShares <= 0) return shares.map(() => 0);
  const raw = shares.map((s) => Math.floor((total * s) / sumShares));
  return distributeRemainder(raw, total);
}

export function validateSum(total: number, amounts: number[]): void {
  const sum = amounts.reduce((s, v) => s + v, 0);
  if (sum !== total) {
    throw new Error(`Amounts (${sum}) do not sum to total (${total})`);
  }
}
