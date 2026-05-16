import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REVEAL_SECRET = Deno.env.get('REVEAL_SECRET')!

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const secret = req.headers.get('x-secret') ?? url.searchParams.get('secret')
  if (secret !== REVEAL_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const deadline = Date.now() + 50_000
  let count = 0

  while (Date.now() < deadline) {
    const { data } = await supabase.rpc('reveal_next_domain')
    if (data === null || data === undefined) break
    count++
    await new Promise(r => setTimeout(r, 1500))
  }

  return new Response(JSON.stringify({ revealed: count }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
