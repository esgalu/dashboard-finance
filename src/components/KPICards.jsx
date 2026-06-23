import './KPICards.css'

export default function KPICards({ kpis }) {
  const formatCurrency = (num) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      notation: 'compact',
      maximumFractionDigits: 0
    }).format(num)
  }

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <p className="kpi-label">Patrimonio Total</p>
        <p className="kpi-value">${Math.round(kpis.patrimony / 1000000)}M</p>
      </div>
      
      <div className="kpi-card">
        <p className="kpi-label">Ahorros Disponibles</p>
        <p className="kpi-value">${Math.round(kpis.savings / 1000000)}M</p>
      </div>

      <div className="kpi-card">
        <p className="kpi-label">Inversiones</p>
        <p className="kpi-value">${Math.round(kpis.investments / 1000000)}M</p>
      </div>

      <div className="kpi-card">
        <p className="kpi-label">Meses de Runway</p>
        <p className="kpi-value">{kpis.runway}</p>
      </div>
    </div>
  )
}
