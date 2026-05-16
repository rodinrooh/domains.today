'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string }

export default function Page() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [search, setSearch] = useState('')
  const lastIdRef = useRef<number>(0)
  const pendingRef = useRef<DomainRow[]>([])

  useEffect(() => {
    supabase
      .from('domains')
      .select('id, domain')
      .eq('shown', true)
      .order('id', { ascending: true })
      .then(({ data }) => {
        if (data?.length) {
          lastIdRef.current = data[data.length - 1].id
          pendingRef.current = data
        }
      })

    const interval = setInterval(async () => {
      if (pendingRef.current.length > 0) {
        const next = pendingRef.current.shift()!
        setDomains(prev => [...prev, next])
      } else {
        const { data } = await supabase
          .from('domains')
          .select('id, domain')
          .eq('shown', true)
          .gt('id', lastIdRef.current)
          .order('id', { ascending: true })
        if (data?.length) {
          lastIdRef.current = data[data.length - 1].id
          pendingRef.current = data
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const filtered = search
    ? domains.filter(d => d.domain.includes(search.toLowerCase()))
    : domains

  return (
    <main style={{ background: '#000000', minHeight: '100vh' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#ffffff', lineHeight: 1, letterSpacing: '-2px' }}>
            {domains.length.toLocaleString()}
          </div>
          <div style={{ color: '#555555', fontSize: 13, marginTop: 10 }}>
            domains registered today
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search domains..."
            style={{
              marginTop: 20,
              background: '#111111',
              border: '1px solid #2a2a2a',
              outline: 'none',
              color: '#ffffff',
              padding: '8px 14px',
              width: '100%',
              maxWidth: 340,
              fontFamily: 'inherit',
              fontSize: 13,
              display: 'block',
              margin: '20px auto 0',
              textAlign: 'center',
            }}
          />
        </div>
        <div>
          {filtered.map(d => (
            <div
              key={d.id}
              onClick={() => window.open(`https://${d.domain}`, '_blank')}
              style={{
                fontSize: 13,
                lineHeight: '26px',
                color: '#cccccc',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#cccccc')}
            >
              {d.domain}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
