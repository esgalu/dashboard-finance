import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { formatCurrency, getTrendColor } from '../../utils/formatters'
import AccountsEvolution from './AccountsEvolution'
import '../tabs/Accounts.css'

export default function Accounts({ accounts, total, accountTimeSeries }) {
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Distribución de Cuentas</h2>
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Sin cuentas disponibles</p>
        </div>
      </div>
    )
  }

  const validTotal = typeof total === 'number' && total > 0 ? total : 0

  return (
    <div className="tab-content">
      <div className="section">
        <h2>Distribución de Cuentas {validTotal > 0 ? `(Total: ${formatCurrency(validTotal)})` : ''}</h2>
        <div className="accounts-grid">
          {accounts.map((account, idx) => {
            if (!account || typeof account.value !== 'number' || account.value <= 0) return null

            const hasReturn = account.percentage !== 0
            const returnColor = getTrendColor(account.percentage)

            return (
              <div key={idx} className="account-card">
                <p className="account-name">{account.name || 'Sin nombre'}</p>
                <p className="account-value">{formatCurrency(account.value)}</p>
                <div className="account-meta">
                  <span className="account-share">{(account.share || 0).toFixed(1)}% del total</span>
                  {hasReturn && (
                    <span className="account-return" style={{ color: returnColor }}>
                      {account.percentage > 0 ? '↑' : '↓'} {Math.abs(account.percentage).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {accountTimeSeries && accountTimeSeries.length > 0 && (
        <AccountsEvolution accounts={accounts} trend={accountTimeSeries} />
      )}

      {(() => {
        const sorted = accounts
          .filter(a => a.percentage !== 0)
          .sort((a, b) => b.percentage - a.percentage)
        if (sorted.length === 0) return null

        const chartHeight = Math.max(400, sorted.length * 40 + 60)

        return (
          <div className="section">
            <h2>Rendimiento vs Valor Inicial</h2>
            <div className="chart-container" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sorted} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={180} />
                  <Tooltip
                    formatter={(value, _, props) => {
                      const a = props.payload
                      return [`${value.toFixed(1)}% (Inicial: ${formatCurrency(a.initialValue)} → Actual: ${formatCurrency(a.value)})`]
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                    {sorted.map((entry, idx) => (
                      <Cell key={idx} fill={entry.percentage >= 0 ? '#6B8E23' : '#c62828'} />
                    ))}
                    <LabelList dataKey="percentage" position="right" formatter={v => `${v.toFixed(1)}%`} style={{ fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
