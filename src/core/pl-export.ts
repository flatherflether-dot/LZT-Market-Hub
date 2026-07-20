import { downloadCsv, toCsv } from './export-csv'
import type { PlReport } from './pl-report'

export function plReportToCsv(report: PlReport): string {
  const rows: Record<string, unknown>[] = [
    { section: 'summary', metric: 'dealCount', value: report.dealCount },
    { section: 'summary', metric: 'totalMargin', value: report.totalMargin },
    { section: 'summary', metric: 'totalBuy', value: report.totalBuy },
    { section: 'summary', metric: 'totalSell', value: report.totalSell },
    { section: 'summary', metric: 'avgMargin', value: report.avgMargin },
    ...report.bySource.map((r) => ({
      section: 'bySource',
      key: r.source,
      margin: r.margin,
      count: r.count
    })),
    ...report.byCategory.map((r) => ({
      section: 'byCategory',
      key: r.category,
      margin: r.margin,
      count: r.count
    })),
    ...report.daily.map((r) => ({
      section: 'daily',
      date: r.date,
      margin: r.margin,
      count: r.count
    }))
  ]
  return toCsv(rows, ['section', 'metric', 'key', 'date', 'value', 'margin', 'count'])
}

export function plReportToJson(report: PlReport): string {
  return JSON.stringify({ exported_at: new Date().toISOString(), ...report }, null, 2)
}

export function plReportToHtml(report: PlReport, title: string): string {
  const rows = report.daily
    .map(
      (d) =>
        `<tr><td>${d.date}</td><td>${d.margin.toFixed(0)}</td><td>${d.count}</td></tr>`
    )
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui;background:#141414;color:#eee;padding:24px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:8px;text-align:left}
h1{color:#00ba78}</style></head><body>
<h1>${title}</h1>
<p>Deals: ${report.dealCount} · Margin: ${report.totalMargin.toFixed(0)} ₽ · Avg: ${report.avgMargin.toFixed(0)} ₽</p>
<h2>Daily</h2><table><thead><tr><th>Date</th><th>Margin</th><th>Deals</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}

function openPlReportPrint(report: PlReport, title: string): void {
  const html = plReportToHtml(report, title)
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export async function downloadPlReport(
  report: PlReport,
  format: 'csv' | 'json' | 'html' | 'pdf' | 'xlsx',
  filenameBase: string
): Promise<void> {
  if (format === 'csv' || format === 'xlsx') {
    downloadCsv(`${filenameBase}.${format === 'xlsx' ? 'xls' : 'csv'}`, plReportToCsv(report))
    return
  }
  if (format === 'json') {
    downloadCsv(`${filenameBase}.json`, plReportToJson(report))
    return
  }
  if (format === 'pdf') {
    openPlReportPrint(report, filenameBase)
    return
  }
  const blob = new Blob([plReportToHtml(report, filenameBase)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenameBase}.html`
  a.click()
  URL.revokeObjectURL(url)
}
