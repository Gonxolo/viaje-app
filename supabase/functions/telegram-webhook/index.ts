import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''

// ── Telegram API helpers ───────────────────────────────────────────────────

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function sendMessage(text: string, extra: Record<string, unknown> = {}) {
  return tg('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'Markdown', ...extra })
}

async function answerCallback(callback_query_id: string, text: string) {
  return tg('answerCallbackQuery', { callback_query_id, text })
}

async function editMessageText(chat_id: number, message_id: number, text: string) {
  return tg('editMessageText', { chat_id, message_id, text, parse_mode: 'Markdown' })
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00Z')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function urgencyEmoji(urgency: string): string {
  return urgency === 'now' ? '🔴' : urgency === 'soon' ? '🟡' : '🟢'
}

function formatItemLine(item: Record<string, unknown>, index: number): string {
  const days = item.buy_by ? daysUntil(item.buy_by as string) : null
  const deadline = days !== null
    ? (days < 0 ? ` ⚠️ vencido` : ` — ${days}d`)
    : ''
  const assignee = item.assigned_to ? ` 👤 ${item.assigned_to}` : ''
  return `${index + 1}. ${urgencyEmoji(item.urgency as string)} *${item.name}*${deadline}${assignee}\n   \`${item.id}\``
}

function doneKeyboard(itemId: string, link: string | null) {
  return {
    inline_keyboard: [
      [
        ...(link ? [{ text: '🔗 Comprar', url: link }] : []),
        { text: '✓ Marcar listo', callback_data: `done:${itemId}` },
      ],
    ],
  }
}

// ── Command handlers ───────────────────────────────────────────────────────

async function handleLista() {
  const { data: items } = await supabase
    .from('trip_items')
    .select('id, name, urgency, buy_by, assigned_to, link')
    .eq('done', false)
    .order('buy_by', { ascending: true, nullsFirst: false })

  if (!items?.length) {
    return sendMessage('✅ No hay ítems pendientes. ¡Todo listo!')
  }

  const lines = items.map((it, i) => formatItemLine(it, i))
  const text = `📋 *Ítems pendientes (${items.length})*\n\n` + lines.join('\n\n')

  // Send list with inline "Listo" buttons for each item
  const keyboard = {
    inline_keyboard: items.map((it) => [
      { text: `✓ ${it.name}`, callback_data: `done:${it.id}` },
    ]),
  }

  return sendMessage(text, { reply_markup: keyboard })
}

async function handleUrgentes() {
  const { data: items } = await supabase
    .from('trip_items')
    .select('id, name, urgency, buy_by, assigned_to, link')
    .eq('done', false)
    .lte('buy_by', new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
    .order('buy_by', { ascending: true })

  if (!items?.length) {
    return sendMessage('✅ No hay ítems urgentes en los próximos 14 días.')
  }

  const lines = items.map((it, i) => formatItemLine(it, i))
  const text = `⚡ *Urgentes — próximos 14 días (${items.length})*\n\n` + lines.join('\n\n')

  const keyboard = {
    inline_keyboard: items.map((it) => [
      { text: `✓ ${it.name}`, callback_data: `done:${it.id}` },
    ]),
  }

  return sendMessage(text, { reply_markup: keyboard })
}

async function handleListo(itemId: string) {
  if (!itemId) return sendMessage('Uso: `/listo <id>`')

  const { error } = await supabase
    .from('trip_items')
    .update({ done: true })
    .eq('id', itemId)

  if (error) return sendMessage(`❌ Error: ${error.message}`)
  return sendMessage(`✅ *${itemId}* marcado como listo.`)
}

async function handleAsignar(itemId: string, person: string) {
  if (!itemId || !person) return sendMessage('Uso: `/asignar <id> <persona>`')

  const { error } = await supabase
    .from('trip_items')
    .update({ assigned_to: person })
    .eq('id', itemId)

  if (error) return sendMessage(`❌ Error: ${error.message}`)
  return sendMessage(`👤 *${itemId}* asignado a *${person}*.`)
}

async function handleRecordatorios(itemId: string, daysArgs: string[]) {
  if (!itemId || !daysArgs.length) {
    return sendMessage('Uso: `/recordatorios <id> <días...>`\nEj: `/recordatorios flight-pus-kix 30 7 1`')
  }

  const days = daysArgs.map(Number).filter((n) => !isNaN(n) && n > 0)
  if (!days.length) return sendMessage('❌ Los días deben ser números positivos.')

  const { error } = await supabase
    .from('trip_items')
    .update({ reminder_days: days })
    .eq('id', itemId)

  if (error) return sendMessage(`❌ Error: ${error.message}`)
  return sendMessage(`🔔 Recordatorios de *${itemId}* configurados: ${days.join(', ')} días antes.`)
}

// ── Main router ────────────────────────────────────────────────────────────

async function handleCommand(message: Record<string, unknown>) {
  const text = (message.text as string | undefined) ?? ''
  const parts = text.trim().split(/\s+/)
  // Strip @BotUsername suffix from command if present
  const cmd = parts[0].split('@')[0].toLowerCase()
  const args = parts.slice(1)

  switch (cmd) {
    case '/lista':
      return handleLista()
    case '/urgentes':
      return handleUrgentes()
    case '/listo':
      return handleListo(args[0])
    case '/asignar':
      return handleAsignar(args[0], args.slice(1).join(' '))
    case '/recordatorios':
      return handleRecordatorios(args[0], args.slice(1))
    default:
      // Ignore unknown commands
  }
}

async function handleCallback(callbackQuery: Record<string, unknown>) {
  const data = callbackQuery.data as string
  const message = callbackQuery.message as Record<string, unknown>
  const [action, itemId] = data.split(':')

  if (action === 'done' && itemId) {
    const { data: item } = await supabase
      .from('trip_items')
      .select('name')
      .eq('id', itemId)
      .maybeSingle()

    await supabase.from('trip_items').update({ done: true }).eq('id', itemId)
    await answerCallback(callbackQuery.id as string, '✓ Marcado como listo')
    await editMessageText(
      (message.chat as Record<string, unknown>).id as number,
      message.message_id as number,
      `✅ *${item?.name ?? itemId}* — marcado como listo`,
    )
  }
}

Deno.serve(async (req) => {
  // Validate Telegram's secret token to reject spoofed requests
  const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let update: Record<string, unknown>
  try {
    update = await req.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  // Must return 200 quickly — Telegram retries if it doesn't get one
  if (update.message) {
    handleCommand(update.message as Record<string, unknown>).catch(console.error)
  } else if (update.callback_query) {
    handleCallback(update.callback_query as Record<string, unknown>).catch(console.error)
  }

  return new Response('ok')
})
