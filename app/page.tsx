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
          setDomains(data)
          lastIdRef.current = data[data.length - 1].id
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
    <main style={{ background: '#000000', minHeight: '100vh', fontFamily: 'monospace' }}>
      <div style={{ padding: '40px 24px 16px' }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
          {domains.length.toLocaleString()}
        </div>
        <div style={{ color: '#666666', fontSize: 13, marginTop: 8 }}>
          domains registered recently
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search domains..."
          style={{
            marginTop: 20,
            background: '#111111',
            border: '1px solid #333333',
            outline: 'none',
            color: '#ffffff',
            padding: '7px 12px',
            width: '100%',
            maxWidth: 360,
            fontFamily: 'monospace',
            fontSize: 13,
            display: 'block',
          }}
        />
      </div>
      <div style={{ paddingBottom: 40 }}>
        {filtered.map(d => (
          <div
            key={d.id}
            onClick={() => window.open(`https://${d.domain}`, '_blank')}
            style={{
              fontSize: 13,
              lineHeight: '26px',
              paddingLeft: 24,
              color: '#cccccc',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#cccccc')}
          >
            {d.domain}
          </div>
        ))}
      </div>
    </main>
  )
}
