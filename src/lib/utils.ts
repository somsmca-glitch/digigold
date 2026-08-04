import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const INR_COMPACT_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0'
  return INR_FORMATTER.format(amount)
}

export function formatINRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0'
  return INR_COMPACT_FORMATTER.format(amount)
}

export function formatGrams(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) return '0.000g'
  return `${grams.toFixed(3)}g`
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function daysOverdue(dueDateString: string): number {
  const due = new Date(dueDateString)
  const today = new Date()
  const diff = today.getTime() - due.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function calcMaturityDate(startDate: Date, durationMonths: number): Date {
  const result = new Date(startDate)
  result.setMonth(result.getMonth() + durationMonths)
  return result
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function percentChange(prev: number, curr: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100
  return ((curr - prev) / prev) * 100
}
