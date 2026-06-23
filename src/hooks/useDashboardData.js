import { useMemo } from 'react'
import { useData } from '../context/DataContext'

export function useDashboardData() {
  const { data: rawData, isLoading, error, dataSource, refreshData } = useData()

  const dashboardData = useMemo(() => {
    if (!rawData) return null

    const savingsData = rawData.savings
    const expensesByCategory = rawData.expenses
    const trendData = rawData.trend
    const movements = rawData.movements || []

    const totalPatrimony = Object.values(savingsData).reduce((a, b) => a + b, 0)
    const investmentValue = Object.entries(savingsData)
      .filter(([key]) => key.includes('TRI'))
      .reduce((sum, [_, value]) => sum + value, 0) + (savingsData['DOLARES'] || 0)
    const savingsValue = totalPatrimony - investmentValue

    const avgMonthlyExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense.reduce((sum, m) => sum + m.total, 0) / rawData.monthlyExpense.length
      : 1
    const monthsOfRunway = Math.round(savingsValue / avgMonthlyExpense)

    const kpis = {
      patrimony: totalPatrimony,
      savings: savingsValue,
      investments: investmentValue,
      runway: monthsOfRunway
    }

    const colors = ['#185FA5', '#0C447C', '#378ADD', '#85B7EB', '#B5D4F4', '#999', '#666', '#444', '#BBB', '#DDD', '#EEE']
    const expensesWithColor = expensesByCategory.map((exp, idx) => ({
      ...exp,
      color: colors[idx % colors.length]
    }))

    const accountsProcessed = Object.entries(savingsData)
      .filter(([_, value]) => value > 0)
      .map(([account, value]) => ({
        name: account,
        value,
        percentage: (value / totalPatrimony) * 100
      }))
      .sort((a, b) => b.value - a.value)

    return {
      kpis,
      expenses: {
        categories: expensesWithColor,
        monthly: rawData.monthlyExpense
      },
      trend: trendData,
      accounts: accountsProcessed,
      movements
    }
  }, [rawData])

  return { ...dashboardData, isLoading, error, dataSource, refreshData }
}
