export interface DealMarginResult {
  netSell: number
  margin: number
  roi: number
}

export function calcDealMargin(buy: number, sell: number, feePercent: number): DealMarginResult {
  const netSell = sell * (1 - feePercent / 100)
  const margin = netSell - buy
  const roi = buy > 0 ? (margin / buy) * 100 : 0
  return { netSell, margin, roi }
}

export function formatDealRoi(roi: number): string {
  return roi.toFixed(1)
}
