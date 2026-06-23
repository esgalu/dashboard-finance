import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../tabs/Trends.css'

export default function Trends({ trend }) {
  return (
    <div className="tab-content">
      <div className="section">
        <h2>Evolución del Patrimonio</h2>
        <div className="chart-container tall">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval={Math.floor(trend.length / 4)}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${Math.round(value / 1000000)}M`}
              />
              <Tooltip 
                formatter={(value) => `$${Math.round(value / 1000000)}M`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#185FA5" 
                strokeWidth={3}
                dot={false}
                name="Patrimonio Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
