import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DataPoint {
  label: string
  value: number
}

interface AreaChartProps {
  data: DataPoint[]
  color?: string
  height?: number
  showGrid?: boolean
  showAxis?: boolean
}

export function AreaChart({
  data,
  color = 'var(--color-primary)',
  height = 200,
  showGrid = true,
  showAxis = true,
}: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-text-muted"
      >
        No data available
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 10, right: 10, left: showAxis ? 0 : -20, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          )}
          {showAxis && (
            <>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                width={40}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [(value ?? 0).toLocaleString(), 'Subscribers']}
            labelFormatter={(label: string) => label}
          />
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#areaGradient)"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
