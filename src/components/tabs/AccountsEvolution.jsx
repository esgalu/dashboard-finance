import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDateShort, formatCurrency, formatShortCurrency } from '../../utils/formatters'
import ExpandableChart from '../ExpandableChart'
import './AccountsEvolution.css'

const ACCOUNT_COLORS = [
  '#185FA5', '#0C447C', '#378ADD', '#6B8E23', '#c62828',
  '#f57c00', '#7b1fa2', '#00796b', '#512da8', '#e91e63'
]

export default function AccountsEvolution({ accounts, trend, mobileMode }) {
  if (!accounts || accounts.length === 0 || !trend || trend.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Evolución de Cuentas</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            Datos insuficientes para mostrar evolución
          </p>
        </div>
      </div>
    )
  }

  const accountsByBank = useMemo(() => {
    const map = {}
    accounts.forEach(a => {
      const parts = a.name.split(' - ')
      const banco = parts[0] || a.name
      const etiqueta = parts.slice(1).join(' - ') || null
      if (!map[banco]) map[banco] = []
      map[banco].push({ ...a, banco, etiqueta })
    })
    return map
  }, [accounts])

  const bancos = Object.keys(accountsByBank).sort()

  // Cada fila del trend (wide format, una columna por cuenta individual) gana
  // ademas una columna por banco con la suma de sus cuentas en esa fecha. No
  // colisiona con las columnas existentes: para bancos de una sola cuenta sin
  // etiqueta, account.name === banco, asi que el total coincide con el valor
  // original de esa columna.
  const trendWithBankTotals = useMemo(() => {
    return trend.map(row => {
      const bankTotals = {}
      accounts.forEach(a => {
        bankTotals[a.banco] = (bankTotals[a.banco] || 0) + (row[a.name] || 0)
      })
      return { ...row, ...bankTotals }
    })
  }, [trend, accounts])

  const [visibleBancos, setVisibleBancos] = useState(bancos)
  const [expandedBancos, setExpandedBancos] = useState([])
  const [selectedAccountsByBanco, setSelectedAccountsByBanco] = useState({})

  const getSelectedAccounts = (banco) =>
    selectedAccountsByBanco[banco] || (accountsByBank[banco] || []).map(a => a.name)

  const toggleBancoVisible = (banco) => {
    setVisibleBancos(prev =>
      prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
    )
  }

  const toggleBancoExpanded = (banco) => {
    if ((accountsByBank[banco] || []).length <= 1) return
    setExpandedBancos(prev =>
      prev.includes(banco) ? prev.filter(b => b !== banco) : [...prev, banco]
    )
  }

  const handleAccountToggle = (banco, name) => {
    setSelectedAccountsByBanco(prev => {
      const current = prev[banco] || (accountsByBank[banco] || []).map(a => a.name)
      const next = current.includes(name)
        ? current.filter(n => n !== name)
        : [...current, name]
      return { ...prev, [banco]: next }
    })
  }

  const handleSelectAllBancos = () => {
    setVisibleBancos(prev => (prev.length === bancos.length ? [] : bancos))
  }

  // Una linea por banco visible (agregada), salvo que el banco este expandido
  // y tenga mas de una cuenta, en cuyo caso se reemplaza por una linea por
  // cada cuenta individual marcada dentro de ese banco.
  const linesToRender = useMemo(() => {
    const lines = []
    bancos.forEach(banco => {
      if (!visibleBancos.includes(banco)) return
      const bankAccounts = accountsByBank[banco] || []
      if (expandedBancos.includes(banco) && bankAccounts.length > 1) {
        const selected = getSelectedAccounts(banco)
        bankAccounts.forEach(acc => {
          if (selected.includes(acc.name)) {
            lines.push({ key: acc.name, dataKey: acc.name, label: acc.etiqueta || acc.name })
          }
        })
      } else {
        lines.push({ key: banco, dataKey: banco, label: banco })
      }
    })
    return lines
  }, [bancos, visibleBancos, expandedBancos, selectedAccountsByBanco, accountsByBank])

  return (
    <div className="tab-content">
      <div className="section">
        <h2>Evolución de Cuentas</h2>

        <div className="account-filter">
          <div className="filter-row">
            <label className="filter-label">Bancos</label>
            <button className="select-all-btn" onClick={handleSelectAllBancos}>
              {visibleBancos.length === bancos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>

          <div className="bank-filter-list">
            {bancos.map((banco, idx) => {
              const bankAccounts = accountsByBank[banco] || []
              const isExpandable = bankAccounts.length > 1
              const isExpanded = isExpandable && expandedBancos.includes(banco)
              const isVisible = visibleBancos.includes(banco)
              const selectedForBanco = getSelectedAccounts(banco)
              const color = ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length]

              return (
                <div key={banco} className="bank-filter-group">
                  <div className="bank-filter-row">
                    <label className="account-checkbox">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleBancoVisible(banco)}
                      />
                      <span className="checkbox-color" style={{ backgroundColor: color }} />
                      <span className="checkbox-label">{banco}</span>
                    </label>

                    {isExpandable && (
                      <button
                        type="button"
                        className={`bank-expand-btn${isExpanded ? ' bank-expand-btn--open' : ''}`}
                        onClick={() => toggleBancoExpanded(banco)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `Colapsar cuentas de ${banco}` : `Expandir cuentas de ${banco}`}
                      >
                        <span className={`bank-chevron${isExpanded ? ' bank-chevron--open' : ''}`} aria-hidden="true">
                          ›
                        </span>
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="bank-subaccount-checkboxes">
                      {bankAccounts.map(account => (
                        <label key={account.name} className="account-checkbox account-checkbox--sub">
                          <input
                            type="checkbox"
                            checked={selectedForBanco.includes(account.name)}
                            onChange={() => handleAccountToggle(banco, account.name)}
                          />
                          <span className="checkbox-label">{account.etiqueta || account.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {linesToRender.length > 0 ? (
          <ExpandableChart mobileMode={mobileMode} title="Evolución de Cuentas">
            <div className="chart-container tall">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendWithBankTotals} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(date) => formatDateShort(date)}
                    interval={Math.max(0, Math.floor(trend.length / 6) - 1)}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatShortCurrency}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(date) => formatDateShort(date)}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Legend />
                  {linesToRender.map((line, idx) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.dataKey}
                      stroke={ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                      name={line.label}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ExpandableChart>
        ) : (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            Selecciona al menos un banco o cuenta para ver la evolución
          </p>
        )}
      </div>
    </div>
  )
}
