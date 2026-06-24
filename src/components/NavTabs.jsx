import './NavTabs.css'

export default function NavTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'overview', label: 'Visión General' },
    { id: 'trends', label: 'Tendencias' },
    { id: 'cashflow', label: 'Flujo' },
    { id: 'accounts', label: 'Cuentas' }
  ]

  return (
    <div className="tabs-container">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
