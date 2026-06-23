import axios from 'axios'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

function serialToDate(val) {
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return val.slice(0, 10)
  const num = Number(val)
  if (isNaN(num) || num < 40000 || num > 60000) return null
  const date = new Date((num - 25569) * 86400000)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getVal(row, idx) {
  if (!row || idx >= row.length) return 0
  const v = row[idx]
  if (typeof v === 'number') return v
  if (!v) return 0
  const cleaned = String(v).replace(/[$,\s]/g, '')
  const num = Number(cleaned)
  return isNaN(num) ? 0 : num
}

function parseSavingsSheet(rows) {
  if (!rows || rows.length < 2) return { savings: {}, trend: [] }

  const header = rows[0]

  const dateColumns = []
  let foundDates = false
  for (let i = 4; i < header.length; i++) {
    const date = serialToDate(header[i])
    if (date) {
      dateColumns.push({ index: i, date })
      foundDates = true
    } else if (foundDates) {
      break
    }
  }

  if (dateColumns.length === 0) return { savings: {}, trend: [] }

  const lastDateIdx = dateColumns[dateColumns.length - 1].index

  const savings = {}
  let totalsRow = null

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length < 3) continue

    const banco = row[1] ? String(row[1]).trim() : ''
    const etiqueta = row[2] ? String(row[2]).trim() : ''

    if (!banco && !etiqueta) {
      const valCount = dateColumns.filter(dc => dc.index < row.length && getVal(row, dc.index) !== 0).length
      if (valCount > 3 && !totalsRow) {
        totalsRow = row
      }
      continue
    }

    const value = getVal(row, lastDateIdx)
    if (value === 0) continue

    const name = etiqueta ? `${banco} - ${etiqueta}` : banco
    savings[name] = (savings[name] || 0) + value
  }

  const trend = []
  if (totalsRow) {
    for (const dc of dateColumns) {
      const total = getVal(totalsRow, dc.index)
      if (total > 0) {
        trend.push({ date: dc.date, total })
      }
    }
  }

  return { savings, trend }
}

function parseCostsSheet(rows) {
  if (!rows || rows.length < 2) return { expenses: [], monthlyExpense: [] }

  const categoryTotals = {}
  const monthlyTotals = {}
  let grandTotal = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length < 5) continue

    const yearMonth = row[1] ? String(row[1]).trim() : ''
    const clasificacion = row[2] ? String(row[2]).trim() : ''
    const costo = getVal(row, 4)

    if (!clasificacion || costo <= 0) continue

    categoryTotals[clasificacion] = (categoryTotals[clasificacion] || 0) + costo
    grandTotal += costo

    if (yearMonth) {
      monthlyTotals[yearMonth] = (monthlyTotals[yearMonth] || 0) + costo
    }
  }

  const expenses = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
      pct: grandTotal > 0 ? Math.round((value / grandTotal) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.value - a.value)

  const monthlyExpense = Object.entries(monthlyTotals)
    .map(([month, total]) => ({ month, total: Math.round(total) }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return { expenses, monthlyExpense }
}

export async function fetchSheetData(accessToken, spreadsheetId) {
  const ranges = ['SAVINGS', 'COSTS!A:E'].map(r => `ranges=${encodeURIComponent(r)}`).join('&')
  const url = `${SHEETS_API}/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  const valueRanges = response.data.valueRanges
  if (!valueRanges || valueRanges.length < 2) {
    throw new Error('El Google Sheet no tiene las hojas esperadas (SAVINGS, COSTS)')
  }

  const { savings, trend } = parseSavingsSheet(valueRanges[0].values)
  const { expenses, monthlyExpense } = parseCostsSheet(valueRanges[1].values)

  return { savings, expenses, monthlyExpense, trend }
}
