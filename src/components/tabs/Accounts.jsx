import '../tabs/Accounts.css'

export default function Accounts({ accounts, total }) {
  return (
    <div className="tab-content">
      <div className="section">
        <h2>Distribución de Cuentas</h2>
        <div className="accounts-grid">
          {accounts.map((account, idx) => (
            <div key={idx} className="account-card">
              <p className="account-name">{account.name}</p>
              <p className="account-value">${Math.round(account.value / 1000000)}M</p>
              <p className="account-pct">{account.percentage.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
