import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateShort, formatCurrency, formatShortCurrency, calculateChange } from '../../utils/formatters'
import '../tabs/Trends.css'

export default function Trends({ trend, projectedTrend }) {
  if (!trend || !Array.isArray(trend) || trend.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Evolución del Patrimonio</h2>
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Sin datos disponibles</p>
        </div>
      </div>
    )
  }

  const validTrend = trend.filter(item => item.date && typeof item.total === 'number')
  if (validTrend.length === 0) return null

  const firstValue = validTrend[0]?.total || 0
  const lastValue = validTrend[validTrend.length - 1]?.total || 0
  const changePercent = calculateChange(lastValue, firstValue)
  const trendDirection = changePercent > 0 ? '↑' : '↓'
  const trendColor = changePercent > 0 ? '#2e7d32' : '#c62828'

  // Combinar datos reales + proyeccion
  const chartData = [
    ...validTrend.map(d => ({ date: d.date, total: d.total, projected: null })),
    ...(projectedTrend || []).map(d => ({ date: d.date, total: d.total || null, projected: d.projected }))
  ]

  const projectedEnd = projectedTrend && projectedTrend.length > 0
    ? projectedTrend[projectedTrend.length - 1].projected
    : null

  return (
    <div className="tab-content">
      <div className="section">
        <div className="trends-header">
          <div>
            <h2>Evolución del Patrimonio</h2>
            <p className="trends-subtitle">
              <span style={{ color: trendColor, fontWeight: 'bold' }}>
                {trendDirection} {Math.abs(changePercent).toFixed(1)}%
              </span>
              {' '}desde {formatDateShort(validTrend[0]?.date)}
              {projectedEnd && (
                <span className="trends-projection-label">
                  {' · '}Proyección 3 meses: {formatCurrency(projectedEnd)}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="chart-container tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => formatDateShort(date)}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={formatShortCurrency}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(value),
                  name === 'projected' ? 'Proyectado' : 'Patrimonio Real'
                ]}
                labelFormatter={(date) => formatDateShort(date)}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Legend formatter={(value) => value === 'projected' ? 'Proyectado' : 'Patrimonio Real'} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#185FA5"
                strokeWidth={3}
                dot={{ fill: '#185FA5', r: 4 }}
                activeDot={{ r: 6 }}
                name="total"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#85B7EB"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                name="projected"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
