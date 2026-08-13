import { useState } from 'react'
import { formatCurrency, formatShortCurrency, formatDateFull } from '../../utils/formatters'
import './Calendar.css'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Nivel de intensidad (1-5) segun el gasto del dia relativo al dia de mayor
// gasto del mes visible. Cada nivel mapea a un paso de la rampa secuencial
// en Calendar.css (mas gasto = mas mezcla del color de "danger").
function intensityLevel(total, maxTotal) {
  if (!maxTotal || total <= 0) return 0
  const ratio = total / maxTotal
  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.6) return 3
  if (ratio <= 0.8) return 4
  return 5
}

export default function Calendar({ expensesByDay, mobileMode }) {
  const dayKeys = Object.keys(expensesByDay || {}).sort()
  const latestKey = dayKeys.length > 0 ? dayKeys[dayKeys.length - 1] : null

  const [viewDate, setViewDate] = useState(() => {
    if (!latestKey) return new Date()
    const [y, m, d] = latestKey.split('-').map(Number)
    return new Date(y, m - 1, d)
  })
  const [selectedDay, setSelectedDay] = useState(latestKey)

  if (dayKeys.length === 0) {
    return (
      <div className="tab-content">
        <div className="section">
          <h2>Calendario</h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Sin datos disponibles</p>
        </div>
      </div>
    )
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7 // Lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const maxTotalInMonth = cells.reduce((max, day) => {
    if (day === null) return max
    const dayData = expensesByDay[toDateKey(year, month, day)]
    return dayData && dayData.total > max ? dayData.total : max
  }, 0)

  const changeMonth = (delta) => {
    setViewDate(new Date(year, month + delta, 1))
  }

  const selectedData = selectedDay ? expensesByDay[selectedDay] : null

  return (
    <div className="tab-content">
      <div className="section">
        <div className="section-header">
          <h2>Calendario de Gastos</h2>
        </div>

        <div className="calendar-card">
          <div className="calendar-nav">
            <button className="calendar-nav-btn" onClick={() => changeMonth(-1)} aria-label="Mes anterior">‹</button>
            <span className="calendar-month-label">{MONTH_NAMES[month]} {year}</span>
            <button className="calendar-nav-btn" onClick={() => changeMonth(1)} aria-label="Mes siguiente">›</button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map(w => <span key={w} className="calendar-weekday">{w}</span>)}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="calendar-cell empty" />
              const key = toDateKey(year, month, day)
              const dayData = expensesByDay[key]
              const hasExpense = !!dayData
              const level = intensityLevel(dayData?.total, maxTotalInMonth)
              return (
                <button
                  key={key}
                  className={`calendar-cell ${hasExpense ? `has-expense level-${level}` : ''} ${selectedDay === key ? 'selected' : ''}`}
                  onClick={() => hasExpense && setSelectedDay(key)}
                  disabled={!hasExpense}
                >
                  <span className="calendar-cell-day">{day}</span>
                  {hasExpense && <span className="calendar-cell-total">{formatShortCurrency(dayData.total).replace('$', '')}</span>}
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span className="calendar-legend-label">Menor gasto</span>
            <span className="calendar-legend-swatch level-1" />
            <span className="calendar-legend-swatch level-2" />
            <span className="calendar-legend-swatch level-3" />
            <span className="calendar-legend-swatch level-4" />
            <span className="calendar-legend-swatch level-5" />
            <span className="calendar-legend-label">Mayor gasto</span>
          </div>
        </div>

        {selectedData && (
          <div className="calendar-day-detail">
            <div className="calendar-day-detail-header">
              <h3>{formatDateFull(selectedDay)}</h3>
              <span className="calendar-day-detail-total">{formatCurrency(selectedData.total)}</span>
            </div>
            <div className="calendar-day-detail-list">
              {selectedData.items.map((item, idx) => (
                <div key={idx} className="calendar-day-detail-item">
                  <div className="calendar-day-detail-info">
                    <p className="calendar-day-detail-name">{item.categoria}</p>
                    <span className="calendar-day-detail-badge">{item.clasificacion}</span>
                  </div>
                  <div className="calendar-day-detail-amount">{formatCurrency(item.costo)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
