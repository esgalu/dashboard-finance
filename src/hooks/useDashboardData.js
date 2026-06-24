import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { calculateChange } from '../utils/formatters'

export function useDashboardData() {
  const { data: rawData, isLoading, error, dataSource, refreshData } = useData()

  const dashboardData = useMemo(() => {
    if (!rawData) return null

    const savingsData = rawData.savings
    const expensesByCategory = rawData.expenses
    const trendData = rawData.trend
    const movements = rawData.movements || []
    const snapshots = rawData.snapshots || []
    const topExpensesRaw = rawData.topExpenses || []
    const incomeByMonth = rawData.incomeByMonth || {}
    const depositsByMonth = rawData.depositsByMonth || {}

    const totalPatrimony = Object.values(savingsData).reduce((a, b) => a + b, 0)
    const investmentValue = Object.entries(savingsData)
      .filter(([key]) => key.includes('TRI'))
      .reduce((sum, [_, value]) => sum + value, 0) + (savingsData['DOLARES'] || 0)
    const savingsValue = totalPatrimony - investmentValue

    const avgMonthlyExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense.reduce((sum, m) => sum + m.total, 0) / rawData.monthlyExpense.length
      : 1
    const monthsOfRunway = Math.round(savingsValue / avgMonthlyExpense)

    const currentMonthExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense[rawData.monthlyExpense.length - 1].total
      : 0

    let expenseChange = 0
    if (rawData.monthlyExpense.length >= 2) {
      const prev = rawData.monthlyExpense[rawData.monthlyExpense.length - 2].total
      const curr = rawData.monthlyExpense[rawData.monthlyExpense.length - 1].total
      expenseChange = calculateChange(curr, prev)
    }

    let patrimonyChange = 0
    if (trendData.length >= 2) {
      const prev = trendData[trendData.length - 2].total
      const curr = trendData[trendData.length - 1].total
      patrimonyChange = calculateChange(curr, prev)
    }

    // Tasa de ahorro: (ingresos - gastos) / ingresos del ultimo mes
    const lastMonth = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense[rawData.monthlyExpense.length - 1].month
      : null
    const lastMonthIncome = lastMonth ? (incomeByMonth[lastMonth] || 0) : 0
    const savingsRate = lastMonthIncome > 0
      ? ((lastMonthIncome - currentMonthExpense) / lastMonthIncome) * 100
      : 0

    const kpis = {
      patrimony: totalPatrimony,
      savings: savingsValue,
      investments: investmentValue,
      runway: monthsOfRunway,
      currentMonthExpense,
      expenseChange,
      patrimonyChange,
      savingsRate
    }

    const colors = ['#185FA5', '#0C447C', '#378ADD', '#85B7EB', '#B5D4F4', '#999', '#666', '#444', '#BBB', '#DDD', '#EEE']
    const expensesWithColor = expensesByCategory.map((exp, idx) => ({
      ...exp,
      color: colors[idx % colors.length]
    }))

    const categoriesByMonth = {}
    if (rawData.expensesByMonth && Object.keys(rawData.expensesByMonth).length > 0) {
      Object.entries(rawData.expensesByMonth).forEach(([month, categories]) => {
        categoriesByMonth[month] = categories.map((cat, idx) => ({
          ...cat,
          color: colors[idx % colors.length]
        }))
      })
    }

    // Valor inicial por cuenta desde snapshots
    const initialValues = {}
    snapshots.forEach(s => {
      const key = s.etiqueta ? `${s.banco} - ${s.etiqueta}` : s.banco
      if (!initialValues[key] || s.fecha < initialValues[key].fecha) {
        initialValues[key] = { fecha: s.fecha, saldo: s.saldo }
      }
    })

    const accountsProcessed = Object.entries(savingsData)
      .filter(([_, value]) => value > 0)
      .map(([account, value]) => {
        const initial = initialValues[account]?.saldo || value
        const returnPct = initial > 0 ? ((value - initial) / initial) * 100 : 0
        return {
          name: account,
          value,
          initialValue: initial,
          percentage: returnPct,
          share: (value / totalPatrimony) * 100
        }
      })
      .sort((a, b) => b.value - a.value)

    // Serie de tiempo por cuenta
    const accountTimeSeries = (() => {
      if (snapshots.length === 0) return []
      const byDate = {}
      snapshots.forEach(s => {
        const key = s.etiqueta ? `${s.banco} - ${s.etiqueta}` : s.banco
        if (!byDate[s.fecha]) byDate[s.fecha] = { date: s.fecha }
        byDate[s.fecha][key] = s.saldo
      })
      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    })()

    // Proyeccion patrimonial (12 semanas ~3 meses)
    const projectedTrend = (() => {
      if (trendData.length < 2) return []
      const first = trendData[0]
      const last = trendData[trendData.length - 1]
      const firstDate = new Date(first.date)
      const lastDate = new Date(last.date)
      const weeks = Math.max((lastDate - firstDate) / (7 * 86400000), 1)
      const weeklyGrowth = (last.total - first.total) / weeks

      const points = []
      for (let w = 1; w <= 12; w++) {
        const futureDate = new Date(lastDate)
        futureDate.setDate(futureDate.getDate() + w * 7)
        const y = futureDate.getFullYear()
        const m = String(futureDate.getMonth() + 1).padStart(2, '0')
        const d = String(futureDate.getDate()).padStart(2, '0')
        points.push({
          date: `${y}-${m}-${d}`,
          projected: Math.round(last.total + weeklyGrowth * w)
        })
      }
      // Agregar punto de union: ultimo real tambien como projected
      return [{ date: last.date, total: last.total, projected: last.total }, ...points]
    })()

    // Flujo de caja: ingresos vs gastos por mes
    const cashFlow = (() => {
      const allMonths = new Set([
        ...rawData.monthlyExpense.map(m => m.month),
        ...Object.keys(incomeByMonth)
      ])
      return Array.from(allMonths)
        .sort()
        .map(month => {
          const expenseEntry = rawData.monthlyExpense.find(m => m.month === month)
          return {
            month,
            income: Math.round(incomeByMonth[month] || 0),
            expenses: Math.round(expenseEntry?.total || 0)
          }
        })
    })()

    // Top 5 gastos del ultimo mes
    const topExpenses = (() => {
      if (topExpensesRaw.length === 0) return []
      const lastExpenseMonth = rawData.monthlyExpense.length > 0
        ? rawData.monthlyExpense[rawData.monthlyExpense.length - 1].month
        : null
      if (!lastExpenseMonth) return topExpensesRaw.slice(0, 5)
      return topExpensesRaw
        .filter(e => e.yearMonth === lastExpenseMonth)
        .slice(0, 5)
    })()

    return {
      kpis,
      expenses: {
        categories: expensesWithColor,
        categoriesByMonth,
        monthly: rawData.monthlyExpense
      },
      trend: trendData,
      projectedTrend,
      cashFlow,
      topExpenses,
      accounts: accountsProcessed,
      movements,
      accountTimeSeries
    }
  }, [rawData])

  return { ...dashboardData, isLoading, error, dataSource, refreshData }
}
