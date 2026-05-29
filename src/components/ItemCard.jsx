import { formatDate, daysUntil, formatPrice, formatCLP, urgencyLabel, urgencyClass } from '../utils'
import { URGENCY } from '../data'

export default function ItemCard({ item, rates, ratesLoading, onToggle, onEdit }) {
  const days = daysUntil(item.buyBy)
  const daysUse = daysUntil(item.useDate)
  const clp = rates && item.price > 0 ? formatCLP(item.price * rates[item.currency]) : null

  const cardClass = [
    'item-card',
    item.done ? 'item-done' : '',
    `urgency-${item.urgency}`,
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      <div className="item-check-col">
        <button
          className={`check-btn ${item.done ? 'checked' : ''}`}
          onClick={() => onToggle(item.id)}
          aria-label={item.done ? 'Marcar como pendiente' : 'Marcar como listo'}
        >
          {item.done && <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
        </button>
      </div>

      <div className="item-body">
        <div className="item-top">
          <div className="item-name-row">
            <span className="item-name">{item.name}</span>
            {!item.done && (
              <span className={`urgency-badge ${urgencyClass(item.urgency)}`}>
                {urgencyLabel(item.urgency)}
              </span>
            )}
            {item.done && <span className="done-badge">✓ Listo</span>}
          </div>
          <div className="item-actions">
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="btn-link" title="Abrir enlace">
                ↗
              </a>
            )}
            <button className="btn-edit" onClick={() => onEdit(item)} title="Editar">
              ✎
            </button>
          </div>
        </div>

        <p className="item-desc">{item.description}</p>

        {item.notes && (
          <div className="item-notes">
            <span className="notes-icon">📝</span> {item.notes}
          </div>
        )}

        <div className="item-meta">
          <div className="meta-row">
            <div className="meta-dates">
              <span className="meta-item">
                <span className="meta-label">Usar:</span>
                <span className="meta-value">{formatDate(item.useDate)}</span>
                {daysUse > 0 && <span className="meta-days">({daysUse}d)</span>}
              </span>
              {item.buyBy !== item.useDate && (
                <span className="meta-item">
                  <span className="meta-label">Comprar antes de:</span>
                  <span className={`meta-value ${days < 14 && !item.done ? 'date-urgent' : ''}`}>
                    {formatDate(item.buyBy)}
                  </span>
                  {days >= 0 && !item.done && (
                    <span className={`meta-days ${days < 14 ? 'days-urgent' : ''}`}>
                      ({days}d)
                    </span>
                  )}
                  {days < 0 && !item.done && (
                    <span className="meta-days days-overdue">(vencido)</span>
                  )}
                </span>
              )}
            </div>

            <div className="meta-price">
              {item.price > 0 ? (
                <>
                  <span className="price-local">{formatPrice(item.price, item.currency)}</span>
                  {ratesLoading && <span className="price-clp loading-text">cargando...</span>}
                  {!ratesLoading && clp && <span className="price-clp">{clp}</span>}
                </>
              ) : (
                <span className="price-local price-free">Incluido en JR Pass</span>
              )}
            </div>
          </div>

          {item.assigned_to && (
            <div className="assigned-row">
              <span className="assigned-label">Responsable:</span>
              <span className="assigned-value">{item.assigned_to}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
