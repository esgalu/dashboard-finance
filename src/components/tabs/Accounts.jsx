import { Fragment, useState } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { formatCurrency, formatShortCurrency, getTrendColor } from '../../utils/formatters'
import AccountsEvolution from './AccountsEvolution'
import ExpandableChart from '../ExpandableChart'
import '../tabs/Accounts.css'

export default function Accounts({ accounts, total, accountTimeSeries, accountsByBank, mobileMode }) {
  const [expandedBanco, setExpandedBanco] = useState(null)

  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Distribución de Cuentas</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Sin cuentas disponibles</p>
        </div>
      </div>
    )
  }

  const validTotal = typeof total === 'number' && total > 0 ? total : 0

  // Fallback defensivo: si por alguna razon no llega la agrupacion por banco
  // (prop no propagada, datos antiguos en cache, etc.), agrupamos aqui mismo
  // sin variacion mensual para no romper el render.
  const bankCards = Array.isArray(accountsByBank) && accountsByBank.length > 0
    ? accountsByBank
    : (() => {
        const grouped = {}
        accounts.forEach(acc => {
          if (!grouped[acc.banco]) grouped[acc.banco] = { banco: acc.banco, value: 0, accounts: [] }
          grouped[acc.banco].value += acc.value
          grouped[acc.banco].accounts.push(acc)
        })
        return Object.values(grouped)
          .map(g => ({ ...g, share: (g.value / validTotal) * 100 || 0, changePercentage: 0, changeAmount: 0 }))
          .sort((a, b) => b.value - a.value)
      })()

  return (
    <div className="tab-content">
      <div className="section">
        <h2>Distribución de Cuentas {validTotal > 0 ? `(Total: ${formatCurrency(validTotal)})` : ''}</h2>
        <p className="accounts-legend">
          <span style={{ color: 'var(--color-success)' }}>●</span> subió{' '}
          <span style={{ color: 'var(--color-danger)' }}>●</span> bajó respecto al snapshot de hace ~1 mes
        </p>
        <div className="accounts-grid">
          {bankCards.map((bank) => {
            if (!bank || typeof bank.value !== 'number' || bank.value <= 0) return null

            const hasChange = !!bank.changePercentage
            const changeColor = getTrendColor(bank.changePercentage)
            const isExpandable = Array.isArray(bank.accounts) && bank.accounts.length > 1
            const isExpanded = isExpandable && expandedBanco === bank.banco

            const toggleExpanded = () => {
              if (!isExpandable) return
              setExpandedBanco(isExpanded ? null : bank.banco)
            }

            return (
              <Fragment key={bank.banco}>
                <div
                  className={`account-card bank-card${isExpandable ? ' bank-card--expandable' : ''}${isExpanded ? ' bank-card--expanded' : ''}`}
                  onClick={toggleExpanded}
                  role={isExpandable ? 'button' : undefined}
                  tabIndex={isExpandable ? 0 : undefined}
                  aria-expanded={isExpandable ? isExpanded : undefined}
                  onKeyDown={isExpandable ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpanded()
                    }
                  } : undefined}
                >
                  <div className="account-name-row">
                    <p className="account-name">{bank.banco || 'Sin nombre'}</p>
                    {isExpandable && (
                      <span className={`bank-chevron${isExpanded ? ' bank-chevron--open' : ''}`} aria-hidden="true">
                        ›
                      </span>
                    )}
                  </div>
                  <p className="account-value">{formatCurrency(bank.value)}</p>
                  <div className="account-meta">
                    <span className="account-share">{(bank.share || 0).toFixed(1)}% del total</span>
                    {hasChange && (
                      <span className="account-return" style={{ color: changeColor }}>
                        {bank.changePercentage > 0 ? '↑' : '↓'} {Math.abs(bank.changePercentage).toFixed(1)}%
                        <span className="account-return-amount">
                          {' '}({bank.changeAmount >= 0 ? '+' : ''}{formatCurrency(bank.changeAmount)})
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="bank-subaccounts-row">
                    {bank.accounts.map((sub) => {
                      const subHasChange = !!sub.monthChangePercentage
                      const subChangeColor = getTrendColor(sub.monthChangePercentage)

                      return (
                        <div key={sub.name} className="subaccount-card">
                          <p className="subaccount-name">{sub.etiqueta || sub.name}</p>
                          <p className="subaccount-value">{formatCurrency(sub.value)}</p>
                          <div className="subaccount-meta">
                            <span className="subaccount-share">
                              {bank.value > 0 ? ((sub.value / bank.value) * 100).toFixed(1) : '0.0'}% de {bank.banco}
                            </span>
                            {subHasChange && (
                              <span className="subaccount-return" style={{ color: subChangeColor }}>
                                {sub.monthChangePercentage > 0 ? '↑' : '↓'} {Math.abs(sub.monthChangePercentage).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>

      <div className="accounts-evolution-section">
        {accountTimeSeries && accountTimeSeries.length > 0 && (
          <AccountsEvolution accounts={accounts} trend={accountTimeSeries} mobileMode={mobileMode} />
        )}
      </div>

      {(() => {
        const sorted = accounts
          .filter(a => a.monthChangePercentage !== 0 && a.name !== 'TRI - DISPONIBLE')
          .sort((a, b) => b.monthChangePercentage - a.monthChangePercentage)
        if (sorted.length === 0) return null

        const chartHeight = Math.max(400, sorted.length * 40 + 60)

        return (
          <div className="section section--rendimiento">
            <h2>Rendimiento vs Mes Anterior</h2>
            <ExpandableChart mobileMode={mobileMode} title="Rendimiento vs Mes Anterior">
              <div className="chart-container" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sorted} layout="vertical" margin={{ top: 10, right: 110, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={180} />
                  <Tooltip
                    formatter={(value, _, props) => {
                      const a = props.payload
                      const previousValue = a.value - a.monthChangeAmount
                      return [`${value.toFixed(1)}% (Mes anterior: ${formatCurrency(previousValue)} → Actual: ${formatCurrency(a.value)})`]
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="monthChangePercentage" radius={[0, 4, 4, 0]}>
                    {sorted.map((entry, idx) => (
                      <Cell key={idx} fill={entry.monthChangePercentage >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
                    ))}
                    <LabelList
                      dataKey="monthChangePercentage"
                      position="right"
                      content={({ x, y, width, height, index }) => {
                        const entry = sorted[index]
                        const amount = entry.monthChangeAmount
                        const sign = amount >= 0 ? '+' : ''
                        return (
                          <text
                            x={x + width + 6}
                            y={y + height / 2}
                            dominantBaseline="middle"
                            fontSize={11}
                            fontWeight={600}
                            fill="var(--text-primary)"
                          >
                            {`${entry.monthChangePercentage.toFixed(1)}% (${sign}${formatShortCurrency(amount)})`}
                          </text>
                        )
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </ExpandableChart>
          </div>
        )
      })()}
    </div>
  )
}
