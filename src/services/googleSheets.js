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

// V1.0: Lee estructura horizontal (fechas en columnas)
function parseSnapshotsFromV1(rows) {
  if (!rows || rows.length < 2) return []

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

  if (dateColumns.length === 0) return []

  const snapshots = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.length < 3) continue

    const banco = row[1] ? String(row[1]).trim() : ''
    const etiqueta = row[2] ? String(row[2]).trim() : ''

    // Skip totals row
    if (!banco && !etiqueta) continue

    const name = etiqueta ? `${banco} - ${etiqueta}` : banco
    if (!name || name === '-') continue

    // Crear snapshot para cada fecha con saldo
    for (const dc of dateColumns) {
      const saldo = getVal(row, dc.index)
      if (saldo > 0) {
        snapshots.push({
          fecha: dc.date,
          banco,
          etiqueta,
          saldo
        })
      }
    }
  }

  return snapshots
}

// V1.1: Lee estructura vertical (una fila por snapshot)
function parseSnapshotsFromV11(rows) {
  if (!rows || rows.length < 2) return []

  // Header: FECHA, BANCO, ETIQUETA, SALDO
  return rows.slice(1)
    .filter(row => row && row.length >= 4)
    .map(row => ({
      fecha: String(row[0]).slice(0, 10),
      banco: String(row[1]).trim(),
      etiqueta: String(row[2]).trim(),
      saldo: getVal(row, 3)
    }))
    .filter(s => s.saldo > 0 && s.fecha && s.banco)
}

// Intentar ambas estructuras y devolver la que funciona
async function loadSnapshots(accessToken, spreadsheetId) {
  const ranges = ['SNAPSHOTS!A:D', 'SAVINGS!A:AM'].map(r => `ranges=${encodeURIComponent(r)}`).join('&')
  const url = `${SHEETS_API}/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  const valueRanges = response.data.valueRanges
  let snapshots = []

  // Intentar v1.1 primero (SNAPSHOTS)
  if (valueRanges[0]?.values && valueRanges[0].values.length > 1) {
    snapshots = parseSnapshotsFromV11(valueRanges[0].values)
    if (snapshots.length > 0) {
      console.log(`Loaded ${snapshots.length} snapshots from SNAPSHOTS (v1.1)`)
      return snapshots
    }
  }

  // Fallback a v1.0 (SAVINGS)
  if (valueRanges[1]?.values && valueRanges[1].values.length > 1) {
    snapshots = parseSnapshotsFromV1(valueRanges[1].values)
    if (snapshots.length > 0) {
      console.log(`Loaded ${snapshots.length} snapshots from SAVINGS (v1.0)`)
      return snapshots
    }
  }

  throw new Error('No se encontraron snapshots en SNAPSHOTS ni SAVINGS')
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

function parseMovementsSheet(rows) {
  if (!rows || rows.length < 2) return []

  return rows.slice(1)
    .filter(row => row && row.length >= 5 && row[0] && row[1])
    .map(row => ({
      fecha: String(row[0]).slice(0, 10),
      banco: String(row[1]).trim(),
      etiqueta: String(row[2]).trim(),
      monto: getVal(row, 3),
      tipo: String(row[4]).trim().toUpperCase()
    }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

export async function fetchSheetData(accessToken, spreadsheetId) {
  const snapshots = await loadSnapshots(accessToken, spreadsheetId)

  // Leer COSTS y MOVIMIENTOS
  const rangesUrl = `${SHEETS_API}/${spreadsheetId}/values:batchGet?ranges=${encodeURIComponent('COSTS!A:E')}&ranges=${encodeURIComponent('MOVIMIENTOS!A:F')}&valueRenderOption=UNFORMATTED_VALUE`
  const rangesResponse = await axios.get(rangesUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  const { expenses, monthlyExpense } = parseCostsSheet(
    rangesResponse.data.valueRanges[0]?.values
  )

  const movements = parseMovementsSheet(
    rangesResponse.data.valueRanges[1]?.values
  )

  // Reconstruir savings desde snapshots (última fecha)
  const latestDate = snapshots.length > 0
    ? snapshots.reduce((max, s) => s.fecha > max ? s.fecha : max, '')
    : null

  const savings = {}
  const trend = {}

  if (latestDate) {
    // Savings: solo la última fecha
    snapshots
      .filter(s => s.fecha === latestDate)
      .forEach(s => {
        const key = s.etiqueta ? `${s.banco} - ${s.etiqueta}` : s.banco
        savings[key] = s.saldo
      })

    // Trend: agregar por fecha (suma total)
    snapshots.forEach(s => {
      trend[s.fecha] = (trend[s.fecha] || 0) + s.saldo
    })
  }

  const trendArray = Object.entries(trend)
    .map(([date, total]) => ({ date, total: Math.round(total) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    savings,
    expenses,
    monthlyExpense,
    trend: trendArray,
    movements
  }
}
