import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatMonth, formatCurrency, formatShortCurrency, calculateChange } from '../../utils/formatters'
import './MonthComparison.css'

export default function MonthComparison({ expenses }) {
  const months = Object.keys(expenses.categoriesByMonth).sort()
  const [monthA, setMonthA] = useState(months[months.length - 2])
  const [monthB, setMonthB] = useState(months[months.length - 1])

  const categoriesA = expenses.categoriesByMonth[monthA] || []
  const categoriesB = expenses.categoriesByMonth[monthB] || []

  const allCategories = new Set([
    ...categoriesA.map(c => c.name),
    ...categoriesB.map(c => c.name)
  ])

  const comparisonData = Array.from(allCategories).map(name => {
    const a = categoriesA.find(c => c.name === name)
    const b = categoriesB.find(c => c.name === name)
    const valA = a?.value || 0
    const valB = b?.value || 0
    const change = calculateChange(valB, valA)
    return { name, valA, valB, diff: valB - valA, change }
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const totalA = comparisonData.reduce((sum, c) => sum + c.valA, 0)
  const totalB = comparisonData.reduce((sum, c) => sum + c.valB, 0)
  const totalChange = calculateChange(totalB, totalA)

  const chartData = comparisonData.map(c => ({
    name: c.name,
    [formatMonth(monthA)]: c.valA,
    [formatMonth(monthB)]: c.valB
  }))

  return (
    <div className="section">
      <div className="section-header">
        <h2>Comparativo Mensual</h2>
      </div>

      <div className="comparison-selectors">
        <select value={monthA} onChange={e => setMonthA(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
        <span className="comparison-vs">vs</span>
        <select value={monthB} onChange={e => setMonthB(e.target.value)}>
          {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
        </select>
      </div>

      <div className="comparison-summary" style={{ color: totalChange > 0 ? '#c62828' : '#2e7d32' }}>
        {totalChange > 0 ? '↑' : '↓'} Gastaste {Math.abs(totalChange).toFixed(1)}%
        {totalChange > 0 ? ' más' : ' menos'} en {formatMonth(monthB)} vs {formatMonth(monthA)}
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatShortCurrency} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey={formatMonth(monthA)} fill="#85B7EB" radius={[0, 4, 4, 0]} />
            <Bar dataKey={formatMonth(monthB)} fill="#185FA5" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="comparison-table">
        <div className="comparison-row comparison-header">
          <span className="comp-name">Categoría</span>
          <span className="comp-val">{formatMonth(monthA)}</span>
          <span className="comp-val">{formatMonth(monthB)}</span>
          <span className="comp-change">Cambio</span>
        </div>
        {comparisonData.map(c => (
          <div key={c.name} className="comparison-row">
            <span className="comp-name">{c.name}</span>
            <span className="comp-val">{formatCurrency(c.valA)}</span>
            <span className="comp-val">{formatCurrency(c.valB)}</span>
            <span className="comp-change" style={{ color: c.change > 0 ? '#c62828' : '#2e7d32' }}>
              {c.change > 0 ? '↑' : '↓'} {Math.abs(c.change).toFixed(1)}%
            </span>
          </div>
        ))}
        <div className="comparison-row comparison-total">
          <span className="comp-name">TOTAL</span>
          <span className="comp-val">{formatCurrency(totalA)}</span>
          <span className="comp-val">{formatCurrency(totalB)}</span>
          <span className="comp-change" style={{ color: totalChange > 0 ? '#c62828' : '#2e7d32' }}>
            {totalChange > 0 ? '↑' : '↓'} {Math.abs(totalChange).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}
