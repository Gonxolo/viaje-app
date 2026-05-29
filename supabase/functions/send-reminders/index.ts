import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00Z')
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

async function sendReminder(item: {
  id: string
  name: string
  buy_by: string
  category: string
  link: string | null
  days: number
}) {
  const text =
    `🔔 *Recordatorio de compra*\n` +
    `*${item.name}*\n` +
    `📅 Comprar antes del ${formatDate(item.buy_by)} — quedan *${item.days} días*\n` +
    `🏷 Categoría: ${item.category}`

  const inlineKeyboard = {
    inline_keyboard: [
      [
        ...(item.link
          ? [{ text: '🔗 Comprar', url: item.link }]
          : []),
        { text: '✓ Marcar listo', callback_data: `done:${item.id}` },
      ],
    ],
  }

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      reply_markup: inlineKeyboard,
    }),
  })
}

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: items, error } = await supabase
    .from('trip_items')
    .select('id, name, buy_by, reminder_days, category, link')
    .eq('done', false)
    .not('buy_by', 'is', null)
    .not('reminder_days', 'is', null)

  if (error) {
    console.error('Error fetching items:', error)
    return new Response('error', { status: 500 })
  }

  let sent = 0

  for (const item of items ?? []) {
    const days = daysUntil(item.buy_by)

    for (const threshold of item.reminder_days as number[]) {
      if (days !== threshold) continue

      // Idempotency check
      const { data: existing } = await supabase
        .from('reminder_log')
        .select('id')
        .eq('item_id', item.id)
        .eq('days_before', threshold)
        .maybeSingle()

      if (existing) continue

      await sendReminder({ ...item, days })
      await supabase
        .from('reminder_log')
        .insert({ item_id: item.id, days_before: threshold })

      sent++
    }
  }

  console.log(`Reminders sent: ${sent}`)
  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
