import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateShort, formatCurrency, calculateChange } from '../../utils/formatters'
import '../tabs/Trends.css'

export default function Trends({ trend }) {
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

  // Validar que los datos tengan la estructura correcta
  const validTrend = trend.filter(item => item.date && typeof item.total === 'number')

  if (validTrend.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Evolución del Patrimonio</h2>
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Datos no válidos</p>
        </div>
      </div>
    )
  }

  // Calcular cambio % desde primer snapshot
  const firstValue = validTrend[0]?.total || 0
  const lastValue = validTrend[validTrend.length - 1]?.total || 0
  const changePercent = calculateChange(lastValue, firstValue)
  const trendDirection = changePercent > 0 ? '↑' : '↓'
  const trendColor = changePercent > 0 ? '#2e7d32' : '#c62828'

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
            </p>
          </div>
        </div>

        <div className="chart-container tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={validTrend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => formatDateShort(date)}
                interval={Math.floor(validTrend.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
              />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(date) => `Fecha: ${date}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '10px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#185FA5"
                strokeWidth={3}
                dot={{ fill: '#185FA5', r: 4 }}
                activeDot={{ r: 6 }}
                name="Patrimonio Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

