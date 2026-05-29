import { useState } from 'react'
import { URGENCY, CURRENCIES } from '../data'

const URGENCY_OPTIONS = [
  { value: URGENCY.NOW, label: 'Comprar ya (meses antes)' },
  { value: URGENCY.SOON, label: 'Comprar pronto (semanas antes)' },
  { value: URGENCY.LATER, label: 'Puede esperar (en destino)' },
]

const CURRENCY_OPTIONS = [
  { value: CURRENCIES.KRW, label: '₩ KRW (Won coreano)' },
  { value: CURRENCIES.JPY, label: '¥ JPY (Yen japonés)' },
  { value: CURRENCIES.USD, label: '$ USD' },
]

export default function EditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Editar ítem</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field-group">
            <label>Nombre</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div className="field-group">
            <label>Descripción</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Precio</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={e => set('price', Number(e.target.value))}
              />
            </div>
            <div className="field-group">
              <label>Moneda</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Comprar antes de</label>
              <input type="date" value={form.buyBy} onChange={e => set('buyBy', e.target.value)} />
            </div>
            <div className="field-group">
              <label>Fecha de uso</label>
              <input type="date" value={form.useDate} onChange={e => set('useDate', e.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <label>Urgencia</label>
            <select value={form.urgency} onChange={e => set('urgency', e.target.value)}>
              {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Responsable</label>
            <input
              value={form.assigned_to || ''}
              onChange={e => set('assigned_to', e.target.value)}
              placeholder="Nombre de quien lo compra"
            />
          </div>

          <div className="field-group">
            <label>Notas / link de confirmación</label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Ej: número de confirmación, link de compra, etc."
            />
          </div>

          <div className="field-group">
            <label>Link de compra</label>
            <input
              type="url"
              value={form.link || ''}
              onChange={e => set('link', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  )
}
