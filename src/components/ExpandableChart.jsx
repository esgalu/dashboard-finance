import { useState } from 'react'
import { createPortal } from 'react-dom'
import './ExpandableChart.css'

export default function ExpandableChart({ mobileMode, title, children }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!mobileMode) return children

  return (
    <div className="expandable-chart">
      <button
        type="button"
        className="chart-expand-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Ampliar gráfica"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      </button>

      {children}

      {isOpen && createPortal(
        <div className="chart-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chart-modal-header">
              <span className="chart-modal-title">{title}</span>
              <button
                type="button"
                className="chart-modal-close"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="chart-modal-body">
              {children}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
