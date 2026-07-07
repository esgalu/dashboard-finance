import { useState } from 'react'
import KPICards from './KPICards'
import Overview from './tabs/Overview'
import Budget from './tabs/Budget'
import CashFlow from './tabs/CashFlow'
import Accounts from './tabs/Accounts'
import Trends from './tabs/Trends'
import MobileBottomNav from './MobileBottomNav'
import './MobileDashboard.css'

const TAB_TITLES = {
  overview: 'Visión General',
  budget: 'Presupuesto',
  cashflow: 'Flujo de Caja',
  accounts: 'Cuentas',
  trends: 'Tendencias',
}

export default function MobileDashboard({ kpis, expenses, trend, projectedTrend, cashFlow, topExpenses, budgetData, accounts, accountTimeSeries }) {
  const [activeTab, setActiveTab] = useState('overview')
  const totalBudget = budgetData?.reduce((sum, b) => sum + b.presupuesto, 0) || 0

  return (
    <div className="mobile-dashboard">
      <header className="mobile-header">
        <div className="mobile-header-brand">
          <img src="/assets/logos/axis-isotipo.svg" alt="AXIS" className="mobile-header-logo" />
          <span className="mobile-header-name">AXIS</span>
        </div>
        <span className="mobile-header-title">{TAB_TITLES[activeTab]}</span>
      </header>

      <div className="mobile-content">
        {activeTab === 'overview' && (
          <>
            {kpis && <KPICards kpis={kpis} />}
            <Overview expenses={expenses} topExpenses={topExpenses} />
          </>
        )}
        {activeTab === 'budget' && <Budget budgetData={budgetData} kpis={kpis} expenses={expenses} />}
        {activeTab === 'cashflow' && <CashFlow cashFlow={cashFlow} totalBudget={totalBudget} />}
        {activeTab === 'accounts' && <Accounts accounts={accounts} total={kpis?.patrimony} accountTimeSeries={accountTimeSeries} />}
        {activeTab === 'trends' && <Trends trend={trend} projectedTrend={projectedTrend} accounts={accounts} mobileMode />}
      </div>

      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
