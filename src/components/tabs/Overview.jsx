import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Legend } from 'recharts'
import { formatMonth, formatCurrency, formatShortCurrency, calculateChange } from '../../utils/formatters'
import MonthComparison from './MonthComparison'
import '../tabs/Overview.css'

export default function Overview({ expenses }) {
  const availableMonths = expenses.monthly?.map(m => m.month) || []
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[availableMonths.length - 1])

  const pieChartData = selectedMonth && expenses.categoriesByMonth?.[selectedMonth]
    ? expenses.categoriesByMonth[selectedMonth]
    : expenses.categories

  const pieTitle = selectedMonth
    ? `Gastos por Categoría - ${formatMonth(selectedMonth)}`
    : 'Gastos por Categoría (Total)'

  const monthVariation = (() => {
    if (expenses.monthly && expenses.monthly.length >= 2) {
      const prev = expenses.monthly[expenses.monthly.length - 2]?.total || 0
      const curr = expenses.monthly[expenses.monthly.length - 1]?.total || 0
      return calculateChange(curr, prev)
    }
    return 0
  })()

  const variationColor = monthVariation > 0 ? '#c62828' : '#2e7d32'

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-header">
          <h2>{pieTitle}</h2>
          <div className="month-selector">
            <button
              className={`month-btn ${!selectedMonth ? 'active' : ''}`}
              onClick={() => setSelectedMonth(null)}
            >
              Todos
            </button>
            {availableMonths.map(month => (
              <button
                key={month}
                className={`month-btn ${selectedMonth === month ? 'active' : ''}`}
                onClick={() => setSelectedMonth(month)}
              >
                {formatMonth(month)}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-container tall">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={(entry) => `${entry.name} ${entry.pct}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Gasto Mensual por Categoría</h2>
          {monthVariation !== 0 && (
            <span className="variation-badge" style={{ color: variationColor }}>
              {monthVariation > 0 ? '↑' : '↓'} {Math.abs(monthVariation).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="chart-container tall">
          <ResponsiveContainer width="100%" height="100%">
            {(() => {
              const colors = ['#185FA5', '#0C447C', '#378ADD', '#85B7EB', '#B5D4F4', '#999', '#666', '#444', '#BBB', '#DDD', '#EEE']
              const allCategories = new Set()
              const stackedData = expenses.monthly.map(m => {
                const cats = expenses.categoriesByMonth?.[m.month] || []
                const row = { month: m.month }
                cats.forEach(c => {
                  row[c.name] = c.value
                  allCategories.add(c.name)
                })
                return row
              })
              const categoryList = Array.from(allCategories)

              return (
                <BarChart data={stackedData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} />
                  <YAxis tickFormatter={formatShortCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(value)} labelFormatter={formatMonth} />
                  <Legend />
                  {categoryList.map((cat, idx) => (
                    <Bar key={cat} dataKey={cat} stackId="expenses" fill={colors[idx % colors.length]} />
                  ))}
                </BarChart>
              )
            })()}
          </ResponsiveContainer>
        </div>
      </div>

      {expenses.categoriesByMonth && Object.keys(expenses.categoriesByMonth).length >= 2 && (
        <MonthComparison expenses={expenses} />
      )}
    </div>
  )
}
