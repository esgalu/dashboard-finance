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

    const totalPatrimony = Object.values(savingsData).reduce((a, b) => a + b, 0)
    const investmentValue = Object.entries(savingsData)
      .filter(([key]) => key.includes('TRI'))
      .reduce((sum, [_, value]) => sum + value, 0) + (savingsData['DOLARES'] || 0)
    const savingsValue = totalPatrimony - investmentValue

    const avgMonthlyExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense.reduce((sum, m) => sum + m.total, 0) / rawData.monthlyExpense.length
      : 1
    const monthsOfRunway = Math.round(savingsValue / avgMonthlyExpense)

    // Gasto este mes (ultimo mes disponible)
    const currentMonthExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense[rawData.monthlyExpense.length - 1].total
      : 0

    // Variacion de gasto mes vs mes
    let expenseChange = 0
    if (rawData.monthlyExpense.length >= 2) {
      const prev = rawData.monthlyExpense[rawData.monthlyExpense.length - 2].total
      const curr = rawData.monthlyExpense[rawData.monthlyExpense.length - 1].total
      expenseChange = calculateChange(curr, prev)
    }

    // Cambio patrimonial % (ultimos 2 puntos de trend)
    let patrimonyChange = 0
    if (trendData.length >= 2) {
      const prev = trendData[trendData.length - 2].total
      const curr = trendData[trendData.length - 1].total
      patrimonyChange = calculateChange(curr, prev)
    }

    const kpis = {
      patrimony: totalPatrimony,
      savings: savingsValue,
      investments: investmentValue,
      runway: monthsOfRunway,
      currentMonthExpense,
      expenseChange,
      patrimonyChange
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

    const accountsProcessed = Object.entries(savingsData)
      .filter(([_, value]) => value > 0)
      .map(([account, value]) => ({
        name: account,
        value,
        percentage: (value / totalPatrimony) * 100
      }))
      .sort((a, b) => b.value - a.value)

    // Serie de tiempo por cuenta (para AccountsEvolution)
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

    return {
      kpis,
      expenses: {
        categories: expensesWithColor,
        categoriesByMonth,
        monthly: rawData.monthlyExpense
      },
      trend: trendData,
      accounts: accountsProcessed,
      movements,
      accountTimeSeries
    }
  }, [rawData])

  return { ...dashboardData, isLoading, error, dataSource, refreshData }
}
