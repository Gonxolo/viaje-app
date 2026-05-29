import { formatCLP } from '../utils'

export default function Summary({ items, rates, ratesDate, ratesLoading }) {
  const total = items.length
  const done = items.filter(i => i.done).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const calcTotal = (filterDone) => {
    if (!rates) return null
    return items
      .filter(i => i.done === filterDone && i.price > 0)
      .reduce((sum, i) => sum + i.price * rates[i.currency], 0)
  }

  const pendingCLP = calcTotal(false)
  const doneCLP = calcTotal(true)

  const now = items.filter(i => i.urgency === 'now' && !i.done).length
  const soon = items.filter(i => i.urgency === 'soon' && !i.done).length

  const ratesDateStr = ratesDate
    ? new Date(ratesDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="summary">
      <div className="summary-cards">
        <div className="summary-card">
          <span className="summary-label">Progreso</span>
          <span className="summary-value">{done}/{total}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="summary-sub">{pct}% completado</span>
        </div>

        <div className="summary-card card-danger">
          <span className="summary-label">⚠ Comprar ya</span>
          <span className="summary-value">{now}</span>
          <span className="summary-sub">ítems urgentes pendientes</span>
        </div>

        <div className="summary-card card-warning">
          <span className="summary-label">📅 Comprar pronto</span>
          <span className="summary-value">{soon}</span>
          <span className="summary-sub">ítems próximos pendientes</span>
        </div>

        <div className="summary-card">
          <span className="summary-label">💸 Total pendiente</span>
          {ratesLoading
            ? <span className="summary-value summary-small loading-text">calculando...</span>
            : <span className="summary-value summary-small">{pendingCLP ? formatCLP(pendingCLP) : '—'}</span>
          }
          <span className="summary-sub">aprox. en CLP</span>
        </div>

        <div className="summary-card card-success">
          <span className="summary-label">✓ Ya pagado</span>
          {ratesLoading
            ? <span className="summary-value summary-small loading-text">calculando...</span>
            : <span className="summary-value summary-small">{doneCLP ? formatCLP(doneCLP) : '—'}</span>
          }
          <span className="summary-sub">aprox. en CLP</span>
        </div>
      </div>

      {ratesDateStr && (
        <p className="rates-note">
          Tipo de cambio al {ratesDateStr} · Los precios son estimados y pueden variar.
        </p>
      )}
    </div>
  )
}
