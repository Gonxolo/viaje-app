import { URGENCY } from './data'

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export function formatPrice(price, currency) {
  if (currency === 'KRW') return `₩ ${price.toLocaleString('es-CL')}`
  if (currency === 'JPY') return `¥ ${price.toLocaleString('es-CL')}`
  if (currency === 'USD') return `US$ ${price.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`
  return `${price}`
}

export function formatCLP(amount) {
  return `$ ${Math.round(amount).toLocaleString('es-CL')} CLP`
}

export function urgencyLabel(u) {
  if (u === URGENCY.NOW) return '🔴 Comprar ya'
  if (u === URGENCY.SOON) return '🟡 Pronto'
  return '🟢 En destino'
}

export function urgencyClass(u) {
  if (u === URGENCY.NOW) return 'urgency-now'
  if (u === URGENCY.SOON) return 'urgency-soon'
  return 'urgency-later'
}
