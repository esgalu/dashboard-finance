import { useState } from 'react'
import KPICards from './components/KPICards'
import NavTabs from './components/NavTabs'
import Overview from './components/tabs/Overview'
import Trends from './components/tabs/Trends'
import CashFlow from './components/tabs/CashFlow'
import Accounts from './components/tabs/Accounts'
import AuthStatus from './components/AuthStatus'
import LoadingOverlay from './components/LoadingOverlay'
import ErrorBanner from './components/ErrorBanner'
import TopExpenses from './components/TopExpenses'
import { useDashboardData } from './hooks/useDashboardData'
import './styles/App.css'

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const { kpis, expenses, trend, projectedTrend, cashFlow, topExpenses, accounts, movements, accountTimeSeries, isLoading, error, dataSource, refreshData } = useDashboardData()

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Mi Patrimonio</h1>
            <p className="header-subtitle">
              {dataSource === 'google'
                ? 'Conectado a Google Sheets'
                : 'Actualizado al 22 de junio de 2026'}
            </p>
          </div>
          <AuthStatus />
        </div>
      </header>

      <main className="app-main">
        {isLoading && <LoadingOverlay />}
        {error && <ErrorBanner message={error} onRetry={refreshData} />}

        {kpis && (
          <>
            <KPICards kpis={kpis} />
            <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="tab-container">
              {activeTab === 'overview' && <Overview expenses={expenses} />}
              {activeTab === 'trends' && <Trends trend={trend} projectedTrend={projectedTrend} />}
              {activeTab === 'cashflow' && <CashFlow cashFlow={cashFlow} />}
              {activeTab === 'accounts' && <Accounts accounts={accounts} total={kpis.patrimony} accountTimeSeries={accountTimeSeries} />}
            </div>

            <TopExpenses topExpenses={topExpenses} />
          </>
        )}

        <footer className="app-footer">
          {dataSource === 'google' ? (
            <>
              <p>Datos cargados desde Google Sheets</p>
              <button className="refresh-btn" onClick={refreshData}>Actualizar datos</button>
            </>
          ) : (
            <>
              <p>Datos locales. Conecta tu Google Sheets para datos en vivo.</p>
            </>
          )}
        </footer>
      </main>
    </div>
  )
}

export default App
