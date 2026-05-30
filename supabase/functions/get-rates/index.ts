const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const key = Deno.env.get('EXCHANGE_API_KEY')
  if (!key) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/CLP`)
  const data = await res.json()

  if (data.result !== 'success') {
    return new Response(JSON.stringify({ error: 'Rate fetch failed' }), {
      status: 502,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const r = data.conversion_rates

  return new Response(
    JSON.stringify({
      rates: {
        KRW: 1 / r.KRW,
        JPY: 1 / r.JPY,
        USD: 1 / r.USD,
        CLP: 1,
      },
      updated: data.time_last_update_utc,
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
