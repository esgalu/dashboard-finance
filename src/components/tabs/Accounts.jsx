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
    </div>
  )
}
