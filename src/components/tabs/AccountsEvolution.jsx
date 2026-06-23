import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateShort, formatCurrency } from '../../utils/formatters'
import './AccountsEvolution.css'

const ACCOUNT_COLORS = [
  '#185FA5',
  '#0C447C',
  '#378ADD',
  '#2e7d32',
  '#c62828',
  '#f57c00',
  '#7b1fa2',
  '#00796b',
  '#512da8',
  '#e91e63'
]

export default function AccountsEvolution({ accounts, trend }) {
  if (!accounts || accounts.length === 0 || !trend || trend.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Evolución de Cuentas</h2>
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            Datos insuficientes para mostrar evolución
          </p>
        </div>
      </div>
    )
  }

  const [selectedAccounts, setSelectedAccounts] = useState(accounts.map(a => a.name))

  const handleAccountToggle = (accountName) => {
    setSelectedAccounts(prev =>
      prev.includes(accountName)
        ? prev.filter(name => name !== accountName)
        : [...prev, accountName]
    )
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(accounts.map(a => a.name))
    }
  }

  return (
    <div className="tab-content">
      <div className="section">
        <h2>Evolución de Cuentas</h2>

        <div className="account-filter">
          <button
            className="select-all-btn"
            onClick={handleSelectAll}
          >
            {selectedAccounts.length === accounts.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
          <div className="account-checkboxes">
            {accounts.map((account, idx) => (
              <label key={account.name} className="account-checkbox">
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.name)}
                  onChange={() => handleAccountToggle(account.name)}
                />
                <span
                  className="checkbox-color"
                  style={{ backgroundColor: ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length] }}
                />
                <span className="checkbox-label">{account.name}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedAccounts.length > 0 ? (
          <div className="chart-container tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => formatDateShort(date)}
                  interval={Math.max(0, Math.floor(trend.length / 6) - 1)}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(date) => `Fecha: ${formatDateShort(date)}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                />
                <Legend />
                {selectedAccounts.map((accountName, idx) => {
                  const accountData = accounts.find(a => a.name === accountName)
                  if (!accountData) return null

                  return (
                    <Line
                      key={accountName}
                      type="monotone"
                      dataKey={accountName}
                      stroke={ACCOUNT_COLORS[accounts.indexOf(accountData) % ACCOUNT_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
            Selecciona al menos una cuenta para ver la evolución
          </p>
        )}
      </div>
    </div>
  )
}
