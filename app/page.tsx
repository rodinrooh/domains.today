'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string }

export default function Page() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [search, setSearch] = useState('')
  const lastIdRef = useRef<number>(0)

  useEffect(() => {
    supabase
      .from('domains')
      .select('id, domain')
      .eq('shown', true)
      .order('id', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setDomains(data)
          lastIdRef.current = data[0].id
        }
      })

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('domains')
        .select('id, domain')
        .eq('shown', true)
        .gt('id', lastIdRef.current)
        .order('id', { ascending: true })
      if (data?.length) {
        lastIdRef.current = data[data.length - 1].id
        setDomains(prev => [...[...data].reverse(), ...prev])
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const filtered = search
    ? domains.filter(d => d.domain.includes(search.toLowerCase()))
    : domains

  function openRandom() {
    if (!domains.length) return
    const pick = domains[Math.floor(Math.random() * domains.length)]
    window.open(`https://${pick.domain}`, '_blank')
  }

  return (
    <main style={{ background: '#000000', minHeight: '100vh' }}>

      <div style={{
        position: 'fixed',
        top: 20,
        left: 24,
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '-0.2px',
        zIndex: 10,
      }}>
        domains.today
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>

          <div style={{ fontSize: 72, fontWeight: 700, color: '#ffffff', lineHeight: 1, letterSpacing: '-2px' }}>
            {filtered.length.toLocaleString()}
          </div>

          <div style={{ color: '#555555', fontSize: 13, marginTop: 10 }}>
            {search ? 'domains matching your search' : 'domains registered today'}
          </div>

          <div style={{ color: '#383838', fontSize: 12, marginTop: 16, lineHeight: '18px', maxWidth: 340, margin: '16px auto 0' }}>
            Every domain name registered on the internet today, surfaced in real time. A new domain appears every 2 seconds.
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

          <button
            onClick={openRandom}
            disabled={!domains.length}
            style={{
              marginTop: 12,
              background: 'none',
              border: '1px solid #2a2a2a',
              color: domains.length ? '#555555' : '#2a2a2a',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: domains.length ? 'pointer' : 'default',
              padding: '7px 20px',
              display: 'inline-block',
            }}
            onMouseEnter={e => { if (domains.length) { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#555555' } }}
            onMouseLeave={e => { e.currentTarget.style.color = domains.length ? '#555555' : '#2a2a2a'; e.currentTarget.style.borderColor = '#2a2a2a' }}
          >
            random ↗
          </button>

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
