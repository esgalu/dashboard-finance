import { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonth, calculateChange } from '../../utils/formatters'
import '../tabs/Overview.css'

export default function Overview({ expenses }) {
  const availableMonths = expenses.monthly?.map(m => m.month) || []
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[availableMonths.length - 1])

  const pieChartData = selectedMonth && expenses.categoriesByMonth?.[selectedMonth]
    ? expenses.categoriesByMonth[selectedMonth]
    : expenses.categories

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
      {/* Gastos por Categoría */}
      <div className="section">
        <div className="section-header">
          <h2>Gastos por Categoría</h2>
          <div className="month-selector">
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
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name} ${entry.pct}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Math.round(value / 1000)}K`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gasto Mensual */}
      <div className="section">
        <div className="section-header">
          <h2>Gasto Mensual</h2>
          {monthVariation !== 0 && (
            <span className="variation-badge" style={{ color: variationColor }}>
              {monthVariation > 0 ? '↑' : '↓'} {Math.abs(monthVariation).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenses.monthly} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(month) => formatMonth(month)} />
              <YAxis />
              <Tooltip
                formatter={(value) => `$${Math.round(value / 1000000)}M`}
                labelFormatter={(month) => formatMonth(month)}
              />
              <Bar dataKey="total" fill="#185FA5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
