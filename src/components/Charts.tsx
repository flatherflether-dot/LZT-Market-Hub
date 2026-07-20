import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from '@core/i18n'
import { formatRub, formatRubCompact } from '@core/market-utils'

interface ChartPoint {
  label: string
  value: number
}

export interface DonutSegment {
  label: string
  value: number
  color?: string

  legendOnly?: boolean
}

type ValueFormat = 'currency' | 'number'

interface ChartCommonProps {
  data: ChartPoint[]
  valueFormat?: ValueFormat
  valueLabelKey?: 'common.margin' | 'dashboard.uploadCount'
}

const CHART = {
  grid: '#303030',
  axis: '#949494',
  tooltipBg: '#242424',
  tooltipBorder: 'rgba(214, 214, 214, 0.12)',
  tooltipLabel: '#949494',
  tooltipValue: '#f5f5f5',
  bar: '#00ba78',
  line: '#228e5d'
}

const CHART_MARGIN = { top: 12, right: 12, left: 4, bottom: 4 }

function truncateLabel(label: string, max = 11): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function formatAxisValue(value: number, format: ValueFormat): string {
  if (format === 'number') return value.toLocaleString('ru-RU')
  return formatRubCompact(value)
}

function formatTooltipValue(value: number, format: ValueFormat): string {
  if (format === 'number') return value.toLocaleString('ru-RU')
  return formatRub(value)
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
  valueLabel
}: {
  active?: boolean
  payload?: Array<{ value?: number | string }>
  label?: string
  valueFormat: ValueFormat
  valueLabel: string
}): React.ReactNode {
  if (!active || !payload?.length) return null
  const raw = payload[0]?.value
  const num = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(num)) return null

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-key">{valueLabel}</span>
        <span className="chart-tooltip-value">{formatTooltipValue(num, valueFormat)}</span>
      </div>
    </div>
  )
}

function useChartAxis(data: ChartPoint[], valueFormat: ValueFormat) {
  const denseLabels = data.length > 4
  const xAxis = {
    dataKey: 'label' as const,
    stroke: CHART.axis,
    tick: { fontSize: 10, fill: CHART.axis },
    interval: 0 as const,
    angle: denseLabels ? -32 : 0,
    textAnchor: denseLabels ? ('end' as const) : ('middle' as const),
    height: denseLabels ? 54 : 30,
    tickFormatter: (v: string) => truncateLabel(String(v))
  }
  const yAxis = {
    stroke: CHART.axis,
    tick: { fontSize: 10, fill: CHART.axis },
    width: valueFormat === 'currency' ? 62 : 44,
    tickFormatter: (v: number) => formatAxisValue(v, valueFormat)
  }
  return { xAxis, yAxis, denseLabels }
}

const DONUT_COLORS = ['#00ba78', '#228e5d', '#e8a020', '#e05252', '#303030']

export function DonutChart({
  data,
  valueFormat = 'number',
  centerLabel,
  centerValue
}: {
  data: DonutSegment[]
  valueFormat?: ValueFormat
  centerLabel?: string
  centerValue?: string
}): React.ReactNode {
  const { t } = useTranslation()
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)
  const segments = data.filter((d) => d.value > 0)
  const pieSegments = segments.filter((d) => !d.legendOnly)
  const pieTotal = pieSegments.reduce((s, d) => s + d.value, 0)
  const displayCenter = useMemo(() => {
    if (!hoveredLabel) {
      return { centerLabel, centerValue }
    }
    const seg = segments.find((item) => item.label === hoveredLabel)
    if (!seg) {
      return { centerLabel, centerValue }
    }
    if (seg.legendOnly || pieTotal <= 0) {
      return {
        centerLabel: seg.label,
        centerValue: valueFormat === 'currency' ? formatRubCompact(seg.value) : seg.value.toLocaleString('ru-RU')
      }
    }
    const share = ((seg.value / pieTotal) * 100).toFixed(0)
    return {
      centerLabel: seg.label,
      centerValue: valueFormat === 'currency' ? formatRubCompact(seg.value) : `${share}%`
    }
  }, [hoveredLabel, segments, pieTotal, centerLabel, centerValue, valueFormat])

  if (segments.length === 0) return <p className="empty-state">{t('common.noData')}</p>

  return (
    <div className="chart-container chart-container-donut">
      <div className="chart-donut-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieSegments}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={pieSegments.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
              activeShape={false}
            >
              {pieSegments.map((entry, index) => (
                <Cell key={entry.label} fill={entry.color ?? DONUT_COLORS[index % DONUT_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {(displayCenter.centerLabel || displayCenter.centerValue) && (
          <div className="chart-donut-center">
            {displayCenter.centerValue && (
              <span className="chart-donut-center-value">{displayCenter.centerValue}</span>
            )}
            {displayCenter.centerLabel && (
              <span className="chart-donut-center-label">{displayCenter.centerLabel}</span>
            )}
          </div>
        )}
      </div>
      <ul className="chart-donut-legend">
        {segments.map((seg, index) => (
          <li
            key={seg.label}
            className={clsx(hoveredLabel === seg.label && 'is-active')}
            onMouseEnter={() => setHoveredLabel(seg.label)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <span className="chart-donut-legend-dot" style={{ background: seg.color ?? DONUT_COLORS[index % DONUT_COLORS.length] }} />
            <span className="chart-donut-legend-label">{seg.label}</span>
            <span className="chart-donut-legend-value">
              {valueFormat === 'currency' ? formatRubCompact(seg.value) : seg.value.toLocaleString('ru-RU')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MarginBarChart({ data, valueFormat = 'currency', valueLabelKey = 'common.margin' }: ChartCommonProps): React.ReactNode {
  const { t } = useTranslation()
  const { xAxis, yAxis } = useChartAxis(data, valueFormat)
  const valueLabel = t(valueLabelKey)

  if (data.length === 0) return <p className="empty-state">{t('common.noData')}</p>

  return (
    <div className="chart-container chart-container-fill">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN} barCategoryGap="24%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={
              <ChartTooltip valueFormat={valueFormat} valueLabel={valueLabel} />
            }
          />
          <Bar
            dataKey="value"
            fill={CHART.bar}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RevenueLineChart({ data, valueFormat = 'currency', valueLabelKey = 'common.margin' }: ChartCommonProps): React.ReactNode {
  const { t } = useTranslation()
  const { xAxis, yAxis } = useChartAxis(data, valueFormat)
  const valueLabel = t(valueLabelKey)

  if (data.length === 0) return <p className="empty-state">{t('common.noData')}</p>

  return (
    <div className="chart-container chart-container-fill">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            content={
              <ChartTooltip valueFormat={valueFormat} valueLabel={valueLabel} />
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={CHART.line}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART.bar, stroke: CHART.line, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: CHART.bar }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
