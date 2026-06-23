import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import '../tabs/Overview.css'

export default function Overview({ expenses }) {
  return (
    <div className="tab-content">
      {/* Gastos por Categoría */}
      <div className="section">
        <h2>Gastos por Categoría (Mayo-Junio)</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenses.categories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name} ${entry.pct}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenses.categories.map((entry, index) => (
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
        <h2>Gasto Mensual</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenses.monthly} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Math.round(value / 1000000)}M`} />
              <Bar dataKey="total" fill="#185FA5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
