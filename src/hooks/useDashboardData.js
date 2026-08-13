import { useMemo } from 'react'
import { useData } from '../context/DataContext'
import { calculateChange, formatShortCurrency } from '../utils/formatters'

// Encuentra, dentro de una serie {date, ...}, la entrada cuya fecha esta mas
// cerca de targetDate. Usado para calcular variaciones "vs. hace N meses"
// tanto a nivel de patrimonio total como por banco individual.
function findClosestEntry(entries, targetDate) {
  if (!entries || entries.length === 0) return null
  return entries.reduce((closest, entry) => {
    const diff = Math.abs(new Date(entry.date) - targetDate)
    const closestDiff = Math.abs(new Date(closest.date) - targetDate)
    return diff < closestDiff ? entry : closest
  })
}

// Detecta si un banco tuvo un DEPOSITO o RETIRO entre dos fechas de snapshot.
// Limite exclusivo-inicio / inclusivo-fin: un movimiento en la fecha inicial
// ya esta reflejado en ese saldo (no afecta el delta del periodo), mientras
// que uno en la fecha final si esta incluido en el saldo final y contamina
// el % de cambio de ese periodo.
function periodHasDepositOrWithdrawal(movements, banco, startDateStr, endDateStr) {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  return movements.some(m => {
    if (m.banco !== banco) return false
    if (m.tipo !== 'DEPOSITO' && m.tipo !== 'RETIRO') return false
    const d = new Date(m.fecha)
    return d > start && d <= end
  })
}

// Tasa de crecimiento organico (solo interes, sin depositos/retiros) por
// banco, promediando los periodos entre snapshots consecutivos que no
// tuvieron movimientos y cuyo cambio fue positivo. Normaliza cada periodo a
// tasa semanal usando el delta real de dias, en vez de asumir cadencia fija.
function calculateOrganicGrowthRate(bankTimeSeriesMap, movements) {
  const perBankRates = {}

  Object.entries(bankTimeSeriesMap).forEach(([banco, dateMap]) => {
    const series = Object.entries(dateMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const rates = []
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1]
      const curr = series[i]
      if (prev.total <= 0) continue

      const pctChange = (curr.total - prev.total) / prev.total
      if (pctChange < 0) continue
      if (periodHasDepositOrWithdrawal(movements, banco, prev.date, curr.date)) continue

      const days = (new Date(curr.date) - new Date(prev.date)) / 86400000
      if (days <= 0) continue
      rates.push(Math.pow(1 + pctChange, 7 / days) - 1)
    }

    if (rates.length > 0) {
      perBankRates[banco] = rates.reduce((a, b) => a + b, 0) / rates.length
    }
  })

  return perBankRates
}

// Combina las tasas por banco en una sola tasa semanal, ponderada por el
// ultimo saldo conocido de cada banco (los bancos con mas plata pesan mas).
function blendOrganicRate(perBankRates, bankTimeSeriesMap) {
  let weightedSum = 0
  let totalWeight = 0

  Object.entries(perBankRates).forEach(([banco, rate]) => {
    const dateMap = bankTimeSeriesMap[banco]
    const latestDate = Object.keys(dateMap).sort().pop()
    const weight = dateMap[latestDate]
    if (weight <= 0) return

    weightedSum += rate * weight
    totalWeight += weight
  })

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

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

    const investmentBanks = ['TRI', 'DOLARES', 'PROTECCION']
    const savingsBanks = ['NU', 'PIBANK', 'LULO', 'BANCOLOMBIA', 'BANCOLOMIA']

    const investmentEntries = Object.entries(savingsData)
      .filter(([key]) => investmentBanks.some(b => key.startsWith(b + ' -') || key === b))
    const investmentValue = investmentEntries.reduce((sum, [_, value]) => sum + value, 0)
    const investmentAccounts = investmentEntries
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, val]) => `${name}: ${formatShortCurrency(val)}`)
      .join(', ')

    const savingsValue = Object.entries(savingsData)
      .filter(([key]) => savingsBanks.some(b => key.startsWith(b + ' -') || key === b))
      .reduce((sum, [_, value]) => sum + value, 0)

    const avgMonthlyExpense = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense.reduce((sum, m) => sum + m.total, 0) / rawData.monthlyExpense.length
      : 1

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
      const curr = trendData[trendData.length - 1]
      const targetDate = new Date(curr.date)
      targetDate.setMonth(targetDate.getMonth() - 1)

      const prevEntry = findClosestEntry(trendData.slice(0, -1), targetDate)

      patrimonyChange = calculateChange(curr.total, prevEntry.total)
    }

    // Tasa de ahorro: (ingresos - gastos) / ingresos del ultimo mes
    const lastMonth = rawData.monthlyExpense.length > 0
      ? rawData.monthlyExpense[rawData.monthlyExpense.length - 1].month
      : null
    const lastMonthIncome = lastMonth ? (incomeByMonth[lastMonth] || 0) : 0
    const savingsRate = lastMonthIncome > 0
      ? ((lastMonthIncome - currentMonthExpense) / lastMonthIncome) * 100
      : 0

    // Presupuesto
    const budgetRaw = rawData.budget || []
    const lastMonthCategories = lastMonth && rawData.expensesByMonth?.[lastMonth]
      ? Object.entries(rawData.expensesByMonth[lastMonth]).reduce((acc, [name, cats]) => {
          if (Array.isArray(cats)) {
            cats.forEach(c => { acc[c.name] = (acc[c.name] || 0) + c.value })
          } else {
            acc[name] = cats
          }
          return acc
        }, {})
      : {}

    const expensesByCat = {}
    if (lastMonth && rawData.expensesByMonth?.[lastMonth]) {
      const monthCats = rawData.expensesByMonth[lastMonth]
      if (Array.isArray(monthCats)) {
        monthCats.forEach(c => { expensesByCat[c.name] = c.value })
      } else {
        Object.assign(expensesByCat, monthCats)
      }
    }

    const budgetData = budgetRaw.map(b => {
      const gastado = expensesByCat[b.categoria] || 0
      const porcentaje = b.presupuesto > 0 ? (gastado / b.presupuesto) * 100 : 0
      const estado = porcentaje > 100 ? 'rojo' : porcentaje > 80 ? 'amarillo' : 'verde'
      return { ...b, gastado, porcentaje, estado }
    }).sort((a, b) => b.porcentaje - a.porcentaje)

    const totalBudget = budgetRaw.reduce((sum, b) => sum + b.presupuesto, 0)
    // Runway usa el presupuesto mensual total en vez del promedio de gasto
    // real, para que refleje cuanto deberia durar el ahorro si te ajustas
    // al presupuesto. Si no hay presupuesto cargado, cae al promedio real.
    const monthsOfRunway = Math.round(savingsValue / (totalBudget > 0 ? totalBudget : avgMonthlyExpense))
    const totalBudgetSpent = budgetData.reduce((sum, b) => sum + b.gastado, 0)
    const budgetUsed = totalBudget > 0 ? (totalBudgetSpent / totalBudget) * 100 : 0
    const budgetRemaining = totalBudget - totalBudgetSpent
    const categoriesOverBudget = budgetData.filter(b => b.estado === 'rojo').length

    const now = new Date()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysRemaining = daysInMonth - dayOfMonth
    const projectedMonthEnd = dayOfMonth > 0 ? Math.round((totalBudgetSpent / dayOfMonth) * daysInMonth) : 0
    const dailyBudgetRemaining = daysRemaining > 0 ? Math.round(budgetRemaining / daysRemaining) : 0

    const kpis = {
      patrimony: totalPatrimony,
      savings: savingsValue,
      investments: investmentValue,
      investmentAccounts,
      runway: monthsOfRunway,
      currentMonthExpense,
      expenseChange,
      patrimonyChange,
      savingsRate,
      budgetUsed,
      budgetRemaining,
      categoriesOverBudget,
      totalBudgetCategories: budgetRaw.length,
      projectedMonthEnd,
      dailyBudgetRemaining
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

    // Serie de tiempo por cuenta individual (banco + etiqueta), usada para
    // calcular la variacion % y en pesos vs. hace ~1 mes de cada cuenta
    const accountTimeSeriesMap = {}
    snapshots.forEach(s => {
      const key = s.etiqueta ? `${s.banco} - ${s.etiqueta}` : s.banco
      if (!accountTimeSeriesMap[key]) accountTimeSeriesMap[key] = {}
      accountTimeSeriesMap[key][s.fecha] = (accountTimeSeriesMap[key][s.fecha] || 0) + s.saldo
    })

    const accountsProcessed = Object.entries(savingsData)
      .filter(([_, value]) => value > 0)
      .map(([account, value]) => {
        const initial = initialValues[account]?.saldo || value
        const returnPct = initial > 0 ? ((value - initial) / initial) * 100 : 0
        const parts = account.split(' - ')
        const banco = parts[0] || account
        const etiqueta = parts.slice(1).join(' - ') || null

        const series = Object.entries(accountTimeSeriesMap[account] || {})
          .map(([date, total]) => ({ date, total }))
          .sort((a, b) => a.date.localeCompare(b.date))

        let monthChangePercentage = 0
        let monthChangeAmount = 0
        if (series.length >= 2) {
          const curr = series[series.length - 1]
          const targetDate = new Date(curr.date)
          targetDate.setMonth(targetDate.getMonth() - 1)
          const prevEntry = findClosestEntry(series.slice(0, -1), targetDate)
          monthChangePercentage = calculateChange(curr.total, prevEntry.total)
          monthChangeAmount = curr.total - prevEntry.total
        }

        return {
          name: account,
          banco,
          etiqueta,
          value,
          initialValue: initial,
          percentage: returnPct,
          share: (value / totalPatrimony) * 100,
          monthChangePercentage,
          monthChangeAmount
        }
      })
      .sort((a, b) => b.value - a.value)

    // Serie de tiempo por banco (suma de saldos de todas sus etiquetas por fecha)
    // Usada para calcular la variacion % vs. hace ~1 mes de cada banco consolidado
    const bankTimeSeriesMap = {}
    snapshots.forEach(s => {
      if (!bankTimeSeriesMap[s.banco]) bankTimeSeriesMap[s.banco] = {}
      bankTimeSeriesMap[s.banco][s.fecha] = (bankTimeSeriesMap[s.banco][s.fecha] || 0) + s.saldo
    })

    // Cuentas consolidadas por banco (para la grilla principal de Cuentas)
    const accountsByBank = (() => {
      const grouped = {}
      accountsProcessed.forEach(acc => {
        if (!grouped[acc.banco]) {
          grouped[acc.banco] = { banco: acc.banco, value: 0, accounts: [] }
        }
        grouped[acc.banco].value += acc.value
        grouped[acc.banco].accounts.push(acc)
      })

      return Object.values(grouped)
        .map(group => {
          const bankSeries = Object.entries(bankTimeSeriesMap[group.banco] || {})
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => a.date.localeCompare(b.date))

          let changePercentage = 0
          let changeAmount = 0
          if (bankSeries.length >= 2) {
            const curr = bankSeries[bankSeries.length - 1]
            const targetDate = new Date(curr.date)
            targetDate.setMonth(targetDate.getMonth() - 1)
            const prevEntry = findClosestEntry(bankSeries.slice(0, -1), targetDate)
            changePercentage = calculateChange(curr.total, prevEntry.total)
            changeAmount = curr.total - prevEntry.total
          }

          return {
            banco: group.banco,
            value: group.value,
            share: totalPatrimony > 0 ? (group.value / totalPatrimony) * 100 : 0,
            changePercentage,
            changeAmount,
            accounts: group.accounts.sort((a, b) => b.value - a.value)
          }
        })
        .sort((a, b) => b.value - a.value)
    })()

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

      // Banda de incertidumbre en forma de cono simetrico: el ancho (mismo
      // hacia arriba y hacia abajo del valor proyectado central) se compone
      // un 3% semana a semana a partir del ultimo valor real. Se calcula
      // como delta absoluto en vez de aplicar +3%/-3% de forma independiente
      // a cada limite, porque eso da un crecimiento compuesto asimetrico
      // (1.03^12 ≈ +42.6% pero 0.97^12 ≈ -30.6%), visualmente mas ancho
      // hacia arriba.
      const BAND_RATE = 0.003

      // Tasa de crecimiento organico (solo interes, sin depositos/retiros),
      // ponderada por saldo actual de cada banco. Sirve para una linea de
      // proyeccion alternativa: "que pasaria si no deposito mas plata".
      const perBankRates = calculateOrganicGrowthRate(bankTimeSeriesMap, movements)
      const organicWeeklyRate = blendOrganicRate(perBankRates, bankTimeSeriesMap)

      const points = []
      for (let w = 1; w <= 12; w++) {
        const futureDate = new Date(lastDate)
        futureDate.setDate(futureDate.getDate() + w * 7)
        const y = futureDate.getFullYear()
        const m = String(futureDate.getMonth() + 1).padStart(2, '0')
        const d = String(futureDate.getDate()).padStart(2, '0')
        const projected = last.total + weeklyGrowth * w
        const bandWidth = last.total * (Math.pow(1 + BAND_RATE, w) - 1)
        points.push({
          date: `${y}-${m}-${d}`,
          projected: Math.round(projected),
          projectedUpper: Math.round(projected + bandWidth),
          projectedLower: Math.round(projected - bandWidth),
          projectedOrganic: Math.round(last.total * Math.pow(1 + organicWeeklyRate, w))
        })
      }
      // Agregar punto de union: ultimo real tambien como projected. Se fija
      // projectedUpper/projectedLower/projectedOrganic al mismo valor (ancho
      // de banda cero) ya que este punto es un dato real conocido, no una
      // proyeccion: las lineas deben abrirse a partir de aqui, no dar un
      // salto brusco.
      return [
        {
          date: last.date,
          total: last.total,
          projected: last.total,
          projectedUpper: last.total,
          projectedLower: last.total,
          projectedOrganic: last.total
        },
        ...points
      ]
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

    // Gastos agrupados por dia exacto, para el calendario: cada dia con
    // registros trae su total y el detalle ordenado de mayor a menor costo
    const expensesByDay = (() => {
      const byDay = {}
      topExpensesRaw.forEach(e => {
        if (!e.fecha) return
        if (!byDay[e.fecha]) byDay[e.fecha] = { total: 0, items: [] }
        byDay[e.fecha].total += e.costo
        byDay[e.fecha].items.push({ clasificacion: e.clasificacion, categoria: e.categoria, costo: e.costo })
      })
      Object.values(byDay).forEach(d => d.items.sort((a, b) => b.costo - a.costo))
      return byDay
    })()

    return {
      kpis,
      expenses: {
        categories: expensesWithColor,
        categoriesByMonth,
        detail: rawData.expenseDetail || {},
        monthly: rawData.monthlyExpense
      },
      trend: trendData,
      projectedTrend,
      cashFlow,
      topExpenses,
      budgetData,
      accounts: accountsProcessed,
      accountsByBank,
      movements,
      accountTimeSeries,
      expensesByDay
    }
  }, [rawData])

  return { ...dashboardData, isLoading, error, dataSource, refreshData }
}
