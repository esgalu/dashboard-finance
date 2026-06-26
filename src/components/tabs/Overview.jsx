import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMonth, formatCurrency } from '../../utils/formatters'
import MonthComparison from './MonthComparison'
import TopExpenses from '../TopExpenses'
import '../tabs/Overview.css'

export default function Overview({ expenses, topExpenses }) {
  const availableMonths = expenses.monthly?.map(m => m.month) || []
  const [selectedMonth, setSelectedMonth] = useState(availableMonths[availableMonths.length - 1])

  const pieChartData = selectedMonth && expenses.categoriesByMonth?.[selectedMonth]
    ? expenses.categoriesByMonth[selectedMonth]
    : expenses.categories

  const pieTitle = selectedMonth
    ? `Gastos por Categoría - ${formatMonth(selectedMonth)}`
    : 'Gastos por Categoría (Total)'

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

      {expenses.categoriesByMonth && Object.keys(expenses.categoriesByMonth).length >= 2 && (
        <MonthComparison expenses={expenses} />
      )}

      <TopExpenses topExpenses={topExpenses} />
    </div>
  )
}
