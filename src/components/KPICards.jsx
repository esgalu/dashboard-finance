import { formatCurrency, formatShortCurrency, getTrendIndicator, getTrendColor } from '../utils/formatters'
import './KPICards.css'

export default function KPICards({ kpis }) {
  const cards = [
    {
      label: 'Patrimonio Total',
      value: formatShortCurrency(kpis.patrimony),
      subtitle: formatCurrency(kpis.patrimony)
    },
    {
      label: 'Ahorros Disponibles',
      value: formatShortCurrency(kpis.savings),
      subtitle: formatCurrency(kpis.savings)
    },
    {
      label: 'Inversiones',
      value: formatShortCurrency(kpis.investments),
      subtitle: formatCurrency(kpis.investments)
    },
    {
      label: 'Meses de Runway',
      value: kpis.runway,
      subtitle: null
    },
    {
      label: 'Gasto Este Mes',
      value: formatShortCurrency(kpis.currentMonthExpense),
      subtitle: formatCurrency(kpis.currentMonthExpense),
      change: kpis.expenseChange,
      invertColor: true
    },
    {
      label: 'Cambio Patrimonial',
      value: `${kpis.patrimonyChange > 0 ? '+' : ''}${kpis.patrimonyChange?.toFixed(1) || 0}%`,
      subtitle: null,
      change: kpis.patrimonyChange
    }
  ]

  return (
    <div className="kpi-grid">
      {cards.map((card, idx) => {
        const changeVal = card.change
        const hasChange = changeVal !== undefined && changeVal !== 0
        const changeColor = card.invertColor
          ? getTrendColor(-changeVal)
          : getTrendColor(changeVal)

        return (
          <div key={idx} className="kpi-card">
            <p className="kpi-label">{card.label}</p>
            <p className="kpi-value">{card.value}</p>
            {card.subtitle && <p className="kpi-subtitle">{card.subtitle}</p>}
            {hasChange && (
              <p className="kpi-change" style={{ color: changeColor }}>
                {getTrendIndicator(card.invertColor ? -changeVal : changeVal)} {Math.abs(changeVal).toFixed(1)}% vs mes ant.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
