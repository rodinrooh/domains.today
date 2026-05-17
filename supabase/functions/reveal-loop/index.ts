import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const deadline = Date.now() + 25_000
  let count = 0

  while (Date.now() < deadline) {
    const { data } = await supabase.rpc('reveal_next_domain')
    if (data === null || data === undefined) break
    count++
    await new Promise(r => setTimeout(r, 800))
  }

  return new Response(JSON.stringify({ revealed: count }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
