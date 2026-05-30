import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''

// ── Types ──────────────────────────────────────────────────────────────────

type Ctx = { message_id: number; message_thread_id?: number }

// ── Telegram API helpers ───────────────────────────────────────────────────

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function sendMessage(
  text: string,
  extra: Record<string, unknown> = {},
  ctx?: Ctx,
) {
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'Markdown',
    ...(ctx && {
      reply_to_message_id: ctx.message_id,
      ...(ctx.message_thread_id && { message_thread_id: ctx.message_thread_id }),
    }),
    ...extra,
  })
}

async function answerCallback(callback_query_id: string, text: string) {
  return tg('answerCallbackQuery', { callback_query_id, text })
}

async function editMessageText(chat_id: number, message_id: number, text: string) {
  return tg('editMessageText', { chat_id, message_id, text, parse_mode: 'Markdown' })
}

async function deleteMessage(chat_id: number, message_id: number) {
  return tg('deleteMessage', { chat_id, message_id })
}

// ── Keyboard helpers ───────────────────────────────────────────────────────

function withDismiss(rows: object[][]): object {
  return { inline_keyboard: [...rows, [{ text: '✕ Cerrar', callback_data: 'dismiss' }]] }
}

// ── Formatting helpers ─────────────────────────────────────────────────────

const CURRENCY_SYMBOL: Record<string, string> = { KRW: '₩', JPY: '¥', USD: 'US$' }

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

function formatPrice(price: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  return `${symbol} ${price.toLocaleString('es-CL')}`
}

function formatItemLine(item: Record<string, unknown>, index: number): string {
  const days = item.buy_by ? daysUntil(item.buy_by as string) : null

  let deadlineStr = ''
  if (item.buy_by) {
    const label = days! < 0
      ? '⚠️ ¡Vencido!'
      : `${days} día${days === 1 ? '' : 's'}`
    deadlineStr = `\n   📅 Comprar antes del ${formatDate(item.buy_by as string)} (${label})`
  }

  const priceStr = item.price
    ? `\n   💰 ${formatPrice(item.price as number, item.currency as string)}`
    : ''
  const assigneeStr = item.assigned_to ? `  👤 ${item.assigned_to}` : ''

  return (
    `${index + 1}. ${urgencyEmoji(item.urgency as string)} *${item.name}*` +
    deadlineStr +
    priceStr + assigneeStr +
    `\n   🆔 \`${item.id}\``
  )
}

// ── Command handlers ───────────────────────────────────────────────────────

async function handleLista(ctx: Ctx) {
  const { data: items } = await supabase
    .from('trip_items')
    .select('id, name, urgency, buy_by, assigned_to, link, price, currency')
    .eq('done', false)
    .order('buy_by', { ascending: true, nullsFirst: false })

  if (!items?.length) {
    return sendMessage('✅ No hay ítems pendientes. ¡Todo listo!', {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const lines = items.map((it, i) => formatItemLine(it, i))
  const text = `📋 *Ítems pendientes (${items.length})*\n\n` + lines.join('\n\n')

  const keyboard = withDismiss(
    items.map((it) => [{ text: `✓ ${it.name}`, callback_data: `done:${it.id}` }]),
  )

  return sendMessage(text, { reply_markup: keyboard }, ctx)
}

async function handleUrgentes(ctx: Ctx) {
  const { data: items } = await supabase
    .from('trip_items')
    .select('id, name, urgency, buy_by, assigned_to, link, price, currency')
    .eq('done', false)
    .lte('buy_by', new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
    .order('buy_by', { ascending: true })

  if (!items?.length) {
    return sendMessage('✅ No hay ítems urgentes en los próximos 14 días.', {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const lines = items.map((it, i) => formatItemLine(it, i))
  const text = `⚡ *Urgentes — próximos 14 días (${items.length})*\n\n` + lines.join('\n\n')

  const keyboard = withDismiss(
    items.map((it) => [{ text: `✓ ${it.name}`, callback_data: `done:${it.id}` }]),
  )

  return sendMessage(text, { reply_markup: keyboard }, ctx)
}

async function handleListo(itemId: string, ctx: Ctx) {
  if (!itemId) {
    return sendMessage('Uso: `/listo <id>`\nEj: `/listo flight-pus-kix`', {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { data: item } = await supabase
    .from('trip_items')
    .select('name')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) {
    return sendMessage(`❌ No encontré el ítem \`${itemId}\`.`, {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { error } = await supabase
    .from('trip_items')
    .update({ done: true })
    .eq('id', itemId)

  if (error) {
    return sendMessage(`❌ Error: ${error.message}`, { reply_markup: withDismiss([]) }, ctx)
  }

  return sendMessage(`✅ *${item.name}* marcado como listo.`, {
    reply_markup: withDismiss([]),
  }, ctx)
}

async function handleAsignar(itemId: string, person: string, ctx: Ctx) {
  if (!itemId || !person) {
    return sendMessage('Uso: `/asignar <id> <persona>`\nEj: `/asignar jr-pass Gonzalo`', {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { data: item } = await supabase
    .from('trip_items')
    .select('name')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) {
    return sendMessage(`❌ No encontré el ítem \`${itemId}\`.`, {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { error } = await supabase
    .from('trip_items')
    .update({ assigned_to: person })
    .eq('id', itemId)

  if (error) {
    return sendMessage(`❌ Error: ${error.message}`, { reply_markup: withDismiss([]) }, ctx)
  }

  return sendMessage(`👤 *${item.name}* asignado a *${person}*.`, {
    reply_markup: withDismiss([]),
  }, ctx)
}

async function handleRecordatorios(itemId: string, daysArgs: string[], ctx: Ctx) {
  if (!itemId || !daysArgs.length) {
    return sendMessage(
      'Uso: `/recordatorios <id> <días...>`\nEj: `/recordatorios jr-pass 30 7 1`',
      { reply_markup: withDismiss([]) },
      ctx,
    )
  }

  const days = daysArgs.map(Number).filter((n) => !isNaN(n) && n > 0)
  if (!days.length) {
    return sendMessage('❌ Los días deben ser números positivos.', {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { data: item } = await supabase
    .from('trip_items')
    .select('name')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) {
    return sendMessage(`❌ No encontré el ítem \`${itemId}\`.`, {
      reply_markup: withDismiss([]),
    }, ctx)
  }

  const { error } = await supabase
    .from('trip_items')
    .update({ reminder_days: days })
    .eq('id', itemId)

  if (error) {
    return sendMessage(`❌ Error: ${error.message}`, { reply_markup: withDismiss([]) }, ctx)
  }

  return sendMessage(
    `🔔 Recordatorios de *${item.name}* configurados: ${days.join(', ')} días antes.`,
    { reply_markup: withDismiss([]) },
    ctx,
  )
}

const MINI_APP_BASE = 'https://gonxolo.github.io/viaje-app/converter/'

async function handleCambio(amount: string, currency: string, ctx: Ctx) {
  const validCurrencies = ['KRW', 'JPY', 'USD', 'CLP']
  const cur = currency.toUpperCase()

  const urlParams = new URLSearchParams()
  if (amount && !isNaN(Number(amount))) urlParams.set('amount', amount)
  if (cur && validCurrencies.includes(cur)) urlParams.set('currency', cur)

  const query = urlParams.toString()
  const miniAppUrl = MINI_APP_BASE + (query ? '?' + query : '')

  return sendMessage(
    `💱 *Conversor de divisas*\n` +
    `Tasas en tiempo real entre ₩ KRW, ¥ JPY, US$ USD y $ CLP.\n\n` +
    `_Toca cualquier campo para escribir desde esa moneda._`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💱 Abrir conversor', url: miniAppUrl }],
          [{ text: '✕ Cerrar', callback_data: 'dismiss' }],
        ],
      },
    },
    ctx,
  )
}

async function handleAyuda(ctx: Ctx) {
  const text =
    `🤖 *Comandos disponibles*\n\n` +
    `/lista — Ver todos los ítems pendientes\n` +
    `/urgentes — Ítems con deadline en los próximos 14 días\n` +
    `/listo <id> — Marcar un ítem como comprado\n` +
    `/asignar <id> <persona> — Asignar responsable\n` +
    `/recordatorios <id> <días> — Cambiar recordatorios\n` +
    `/cambio [cantidad] [moneda] — Conversor de divisas\n` +
    `/ayuda — Mostrar esta ayuda\n\n` +
    `*Ejemplos:*\n` +
    `• \`/listo flight-pus-kix\`\n` +
    `• \`/asignar jr-pass Gonzalo\`\n` +
    `• \`/recordatorios jr-pass 30 7 1\`\n` +
    `• \`/cambio 50000 KRW\`\n\n` +
    `Los IDs aparecen en cada ítem de /lista y /urgentes.`

  return sendMessage(text, { reply_markup: withDismiss([]) }, ctx)
}

// ── Main router ────────────────────────────────────────────────────────────

async function handleCommand(message: Record<string, unknown>) {
  const text = (message.text as string | undefined) ?? ''
  const parts = text.trim().split(/\s+/)
  const cmd = parts[0].split('@')[0].toLowerCase()
  const args = parts.slice(1)

  const ctx: Ctx = {
    message_id: message.message_id as number,
    message_thread_id: message.message_thread_id as number | undefined,
  }

  switch (cmd) {
    case '/lista':         return handleLista(ctx)
    case '/urgentes':      return handleUrgentes(ctx)
    case '/listo':         return handleListo(args[0], ctx)
    case '/asignar':       return handleAsignar(args[0], args.slice(1).join(' '), ctx)
    case '/recordatorios': return handleRecordatorios(args[0], args.slice(1), ctx)
    case '/cambio':        return handleCambio(args[0] ?? '', args[1] ?? '', ctx)
    case '/ayuda':         return handleAyuda(ctx)
    default:               // Ignore unknown commands
  }
}

async function handleCallback(callbackQuery: Record<string, unknown>) {
  const data = callbackQuery.data as string
  const message = callbackQuery.message as Record<string, unknown>
  const chat = message.chat as Record<string, unknown>
  const chatId = chat.id as number
  const messageId = message.message_id as number
  const [action, itemId] = data.split(':')

  if (action === 'dismiss') {
    await answerCallback(callbackQuery.id as string, 'Mensaje eliminado')
    await deleteMessage(chatId, messageId)
    return
  }

  if (action === 'done' && itemId) {
    const { data: item } = await supabase
      .from('trip_items')
      .select('name')
      .eq('id', itemId)
      .maybeSingle()

    await supabase.from('trip_items').update({ done: true }).eq('id', itemId)
    await answerCallback(callbackQuery.id as string, '✓ Marcado como listo')
    await editMessageText(chatId, messageId, `✅ *${item?.name ?? itemId}* — marcado como listo`)
  }
}

Deno.serve(async (req) => {
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
