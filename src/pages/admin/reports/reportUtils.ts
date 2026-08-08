// ── Shared types, colors & helpers used across all report pages ──

export interface ChitRow {
  id: string
  status: string
  maturity_date: string
  start_date: string
  agreed_amount: number | null
  scheme_id: string
  scheme?: { name: string; duration_months: number }
  customer?: { name: string; phone: string }
}

export interface CustomerRow {
  id: string
  name: string
  phone: string
  city: string | null
  created_at: string
}

export interface GoldRateRow {
  date: string
  rate_22k: number
  rate_24k: number
  silver_rate: number
}

export const GOLD_COLORS = ['#DAA520', '#F0C040', '#B8860B', '#E8C96E', '#92660A', '#FDE68A']

export const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  redeemed: '#3b82f6',
  closed: '#6b7280',
  defaulted: '#ef4444',
}

export function exportCSV(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
