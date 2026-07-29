import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateShort, formatCurrency, formatShortCurrency, calculateChange } from '../../utils/formatters'
import ExpandableChart from '../ExpandableChart'
import '../tabs/Trends.css'

export default function Trends({ trend, projectedTrend, accounts, mobileMode }) {
  if (!trend || !Array.isArray(trend) || trend.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Evolución del Patrimonio</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Sin datos disponibles</p>
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
  const trendColor = changePercent > 0 ? 'var(--color-success)' : 'var(--color-danger)'

  // Combinar datos reales + proyeccion.
  // projectedTrend[0] (cuando existe) ya repite el ultimo punto real como punto
  // de union, con `total` y `projected` seteados, para que las lineas se toquen
  // sin salto visual. Si tambien incluimos el ultimo punto de validTrend por
  // separado, terminamos con dos entradas distintas para la misma fecha
  // (mismo total, projected null vs. seteado), lo que Recharts dibuja como dos
  // categorias consecutivas identicas en el eje X. Por eso excluimos el ultimo
  // punto real cuando hay proyeccion: el punto de union de projectedTrend lo
  // reemplaza sin duplicar la fecha.
  const hasProjection = projectedTrend && projectedTrend.length > 0
  const realPoints = hasProjection ? validTrend.slice(0, -1) : validTrend
  const chartData = [
    ...realPoints.map(d => ({
      date: d.date,
      total: d.total,
      projected: null,
      projectedUpper: null,
      projectedLower: null,
      projectedOrganic: null,
      range: null
    })),
    ...(projectedTrend || []).map(d => ({
      date: d.date,
      total: d.total || null,
      projected: d.projected,
      projectedUpper: d.projectedUpper,
      projectedLower: d.projectedLower,
      projectedOrganic: d.projectedOrganic,
      // Recharts dibuja un "area range" cuando dataKey resuelve a un array
      // [min, max] por punto, en vez de apilar dos Area (una invisible + una
      // visible), que es mas fragil y requiere sincronizar stackId. Con un
      // solo <Area dataKey="range" /> el relleno queda exactamente entre
      // projectedLower y projectedUpper sin trucos adicionales.
      range: (d.projectedLower != null && d.projectedUpper != null)
        ? [d.projectedLower, d.projectedUpper]
        : null
    }))
  ]

  const projectedEnd = projectedTrend && projectedTrend.length > 0
    ? projectedTrend[projectedTrend.length - 1].projected
    : null

  const organicEnd = projectedTrend && projectedTrend.length > 0
    ? projectedTrend[projectedTrend.length - 1].projectedOrganic
    : null
  const organicChangePercent = organicEnd != null ? calculateChange(organicEnd, lastValue) : null

  // Eje Y: ventana fija de +/-30M alrededor del ultimo dato REGISTRADO
  // (historico real, no proyectado), a pedido del usuario. Los valores en la
  // app se manejan en pesos completos (ver formatShortCurrency), asi que 30M
  // se expresa tal cual (30000000).
  //
  // La banda de incertidumbre (+/-30% compuesto sobre 12 semanas) puede
  // extenderse mas alla de esa ventana fija en las ultimas semanas de la
  // proyeccion. Para no recortar la banda ni las lineas de limite, el
  // dominio final es el MAS ANCHO entre la ventana fija original (que sigue
  // actuando como piso minimo garantizado) y el rango real de todos los
  // valores dibujados (total, projected, projectedUpper, projectedLower).
  const Y_AXIS_WINDOW = 30000000
  const allChartValues = chartData
    .flatMap(d => [d.total, d.projected, d.projectedUpper, d.projectedLower, d.projectedOrganic])
    .filter(v => typeof v === 'number')
  const minOfAll = allChartValues.length ? Math.min(...allChartValues) : lastValue
  const maxOfAll = allChartValues.length ? Math.max(...allChartValues) : lastValue
  const yDomain = [
    Math.max(0, Math.min(lastValue - Y_AXIS_WINDOW, minOfAll)),
    Math.max(lastValue + Y_AXIS_WINDOW, maxOfAll)
  ]

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
              {organicChangePercent != null && (
                <span className="trends-projection-label">
                  {' · '}Crecimiento orgánico 3 meses: {organicChangePercent >= 0 ? '+' : ''}{organicChangePercent.toFixed(1)}%
                </span>
              )}
            </p>
          </div>
        </div>

        <ExpandableChart mobileMode={mobileMode} title="Evolución del Patrimonio">
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={mobileMode ? { fontSize: 9, angle: -45, textAnchor: 'end' } : { fontSize: 12 }}
                  tickFormatter={(date) => formatDateShort(date)}
                  interval={mobileMode ? Math.floor(chartData.length / 4) : Math.floor(chartData.length / 6)}
                  height={mobileMode ? 48 : 30}
                />
                <YAxis
                  tick={{ fontSize: mobileMode ? 9 : 12 }}
                  tickFormatter={formatShortCurrency}
                  width={mobileMode ? 52 : 60}
                  domain={yDomain}
                />
                <Tooltip
                  // Contenido a medida: el tooltip por defecto de Recharts lista
                  // una fila por cada serie con dato en ese punto, lo que
                  // incluiria projectedUpper/projectedLower/range (poco utiles
                  // para el usuario). Se filtra a solo total/projected, igual
                  // que el comportamiento previo a la banda de incertidumbre.
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null
                    const items = payload.filter(p => p.dataKey === 'total' || p.dataKey === 'projected' || p.dataKey === 'projectedOrganic')
                    if (items.length === 0) return null
                    const labelFor = (dataKey) => {
                      if (dataKey === 'projected') return 'Proyectado'
                      if (dataKey === 'projectedOrganic') return 'Crecimiento orgánico'
                      return 'Patrimonio Real'
                    }
                    return (
                      <div
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '10px',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <p style={{ margin: 0 }}>{formatDateShort(label)}</p>
                        {items.map(item => (
                          <p key={item.dataKey} style={{ margin: 0, color: item.color }}>
                            {labelFor(item.dataKey)}: {formatCurrency(item.value)}
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend
                  payload={[
                    { value: 'Patrimonio Real', type: 'line', color: 'var(--color-primary)' },
                    { value: 'Proyección', type: 'line', color: '#85B7EB' },
                    { value: 'Crecimiento orgánico', type: 'line', color: '#378ADD' }
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="range"
                  stroke="none"
                  fill="#85B7EB"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                  connectNulls
                  legendType="none"
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="projectedUpper"
                  stroke="#85B7EB"
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={false}
                  activeDot={false}
                  name="projectedUpper"
                  legendType="none"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="projectedLower"
                  stroke="#85B7EB"
                  strokeOpacity={0.55}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={false}
                  activeDot={false}
                  name="projectedLower"
                  legendType="none"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--color-primary)', r: 4 }}
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
                <Line
                  type="monotone"
                  dataKey="projectedOrganic"
                  stroke="#378ADD"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  dot={false}
                  name="projectedOrganic"
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ExpandableChart>
      </div>

      {accounts && accounts.length > 0 && (
        <div className="section">
          <h2>Composición del Patrimonio</h2>
          <p className="trends-subtitle">Porcentaje que cada cuenta aporta al total</p>
          <div className="composition-list">
            {accounts
              .filter(a => a.share > 0)
              .sort((a, b) => b.share - a.share)
              .map((a, idx) => (
                <div key={idx} className="composition-item">
                  <div className="composition-info">
                    <span className="composition-name">{a.etiqueta || a.name}</span>
                    <span className="composition-banco">{a.banco}</span>
                  </div>
                  <div className="composition-bar-container">
                    <div className="composition-bar" style={{ width: `${Math.max(a.share, 1)}%` }} />
                  </div>
                  <span className="composition-pct">{a.share.toFixed(1)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
