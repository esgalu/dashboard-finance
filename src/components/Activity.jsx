import './Activity.css'

export default function Activity({ movements }) {
  if (!movements || movements.length === 0) {
    return (
      <div className="activity-container">
        <h3>Actividad Reciente</h3>
        <p className="activity-empty">Sin movimientos registrados</p>
      </div>
    )
  }

  const recentMovements = movements.slice(0, 10)

  return (
    <div className="activity-container">
      <h3>Actividad Reciente</h3>
      <div className="activity-list">
        {recentMovements.map((mov, idx) => {
          const isDeposit = mov.tipo === 'DEPOSITO'
          const label = mov.etiqueta ? `${mov.banco} - ${mov.etiqueta}` : mov.banco
          const displayMonto = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
          }).format(mov.monto)

          return (
            <div key={idx} className="activity-item">
              <div className="activity-left">
                <div className={`activity-icon ${isDeposit ? 'deposit' : 'withdrawal'}`}>
                  {isDeposit ? '↓' : '↑'}
                </div>
                <div className="activity-info">
                  <p className="activity-label">{label}</p>
                  <p className="activity-date">{mov.fecha}</p>
                </div>
              </div>
              <div className={`activity-amount ${isDeposit ? 'positive' : 'negative'}`}>
                {isDeposit ? '+' : '-'}{displayMonto}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
