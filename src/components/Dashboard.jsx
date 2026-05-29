import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { ITEMS_DEFAULT, CATEGORIES, URGENCY } from '../data'
import ItemCard from './ItemCard'
import Summary from './Summary'
import EditModal from './EditModal'

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Por urgencia' },
  { value: 'useDate', label: 'Por fecha de uso' },
  { value: 'buyBy', label: 'Por fecha límite de compra' },
  { value: 'category', label: 'Por categoría' },
]

const URGENCY_ORDER = { [URGENCY.NOW]: 0, [URGENCY.SOON]: 1, [URGENCY.LATER]: 2 }

export default function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [rates, setRates] = useState(null)
  const [ratesDate, setRatesDate] = useState(null)
  const [sortBy, setSortBy] = useState('urgency')
  const [filterCategory, setFilterCategory] = useState('Todos')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [editItem, setEditItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ratesLoading, setRatesLoading] = useState(true)

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(
          `https://v6.exchangerate-api.com/v6/${import.meta.env.VITE_EXCHANGE_API_KEY}/latest/CLP`
        )
        const data = await res.json()
        if (data.result === 'success') {
          // rates are: 1 CLP = X foreign
          // we want: 1 foreign = Y CLP → invert
          const r = data.conversion_rates
          setRates({
            KRW: 1 / r.KRW,
            JPY: 1 / r.JPY,
            USD: 1 / r.USD,
          })
          setRatesDate(data.time_last_update_utc)
        }
      } catch (e) {
        console.error('Error fetching rates', e)
      }
      setRatesLoading(false)
    }
    fetchRates()
  }, [])

  // Load items from Supabase, falling back to defaults
  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('trip_items')
      .select('*')
      .order('id')

    if (error) {
      console.error(error)
      setItems(ITEMS_DEFAULT.map(i => ({ ...i, done: false, assigned_to: null, notes: null })))
    } else if (data.length === 0) {
      // First run: seed with defaults
      const toInsert = ITEMS_DEFAULT.map(i => ({
        id: i.id,
        category: i.category,
        name: i.name,
        description: i.description,
        urgency: i.urgency,
        buy_by: i.buyBy,
        use_date: i.useDate,
        price: i.price,
        currency: i.currency,
        link: i.link,
        done: false,
        assigned_to: null,
        notes: null,
      }))
      const { data: inserted } = await supabase.from('trip_items').insert(toInsert).select()
      setItems((inserted || toInsert).map(normalizeItem))
    } else {
      setItems(data.map(normalizeItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('trip_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_items' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item =>
            item.id === payload.new.id ? normalizeItem(payload.new) : item
          ))
        } else if (payload.eventType === 'INSERT') {
          setItems(prev => [...prev, normalizeItem(payload.new)])
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const toggleDone = async (id) => {
    const item = items.find(i => i.id === id)
    const newDone = !item.done
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: newDone } : i))
    await supabase.from('trip_items').update({ done: newDone }).eq('id', id)
  }

  const saveItem = async (updated) => {
    const row = {
      name: updated.name,
      description: updated.description,
      price: updated.price,
      currency: updated.currency,
      buy_by: updated.buyBy,
      use_date: updated.useDate,
      assigned_to: updated.assigned_to,
      notes: updated.notes,
      link: updated.link,
      urgency: updated.urgency,
      reminder_days: updated.reminder_days,
    }
    await supabase.from('trip_items').update(row).eq('id', updated.id)
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
    setEditItem(null)
  }

  const sortedFiltered = () => {
    let list = [...items]
    if (filterCategory !== 'Todos') list = list.filter(i => i.category === filterCategory)
    if (filterStatus === 'Pendiente') list = list.filter(i => !i.done)
    if (filterStatus === 'Listo') list = list.filter(i => i.done)

    list.sort((a, b) => {
      if (sortBy === 'urgency') return URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
      if (sortBy === 'useDate') return new Date(a.useDate) - new Date(b.useDate)
      if (sortBy === 'buyBy') return new Date(a.buyBy) - new Date(b.buyBy)
      if (sortBy === 'category') return a.category.localeCompare(b.category)
      return 0
    })
    return list
  }

  const handleSignOut = () => supabase.auth.signOut()

  const displayList = sortedFiltered()
  const grouped = sortBy === 'category' || filterCategory !== 'Todos'
    ? null
    : groupByCategory(displayList)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="header-flags">🇰🇷 🇯🇵</span>
          <div>
            <h1 className="header-title">Viaje Corea + Japón</h1>
            <p className="header-sub">2 – 19 noviembre 2026</p>
          </div>
        </div>
        <div className="header-right">
          <span className="header-user">{session.user.email}</span>
          <button className="btn-ghost" onClick={handleSignOut}>Salir</button>
        </div>
      </header>

      <main className="app-main">
        <Summary items={items} rates={rates} ratesDate={ratesDate} ratesLoading={ratesLoading} />

        <div className="controls">
          <div className="controls-left">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="Todos">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Listo">Listo ✓</option>
            </select>
          </div>
          <div className="controls-right">
            <span className="items-count">{displayList.filter(i => i.done).length} / {displayList.length} listos</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-inline">Cargando ítems...</div>
        ) : grouped ? (
          Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} className="category-group">
              <h2 className="category-title">{cat}</h2>
              {catItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  rates={rates}
                  ratesLoading={ratesLoading}
                  onToggle={toggleDone}
                  onEdit={setEditItem}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="items-list">
            {displayList.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                rates={rates}
                ratesLoading={ratesLoading}
                onToggle={toggleDone}
                onEdit={setEditItem}
              />
            ))}
          </div>
        )}
      </main>

      {editItem && (
        <EditModal item={editItem} onSave={saveItem} onClose={() => setEditItem(null)} />
      )}
    </div>
  )
}

function normalizeItem(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description,
    urgency: row.urgency,
    buyBy: row.buy_by,
    useDate: row.use_date,
    price: row.price,
    currency: row.currency,
    link: row.link,
    done: row.done,
    assigned_to: row.assigned_to,
    notes: row.notes,
    reminder_days: row.reminder_days,
  }
}

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}
