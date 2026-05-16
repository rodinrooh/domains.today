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
        top: 22,
        left: 24,
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        zIndex: 10,
      }}>
        domains.today
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '72px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>

          <div style={{ fontSize: 88, fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-4px' }}>
            {filtered.length.toLocaleString()}
          </div>

          <div style={{ color: '#444444', fontSize: 13, fontWeight: 500, marginTop: 12, letterSpacing: '0.01em' }}>
            {search ? 'domains matching your search' : 'domains registered today'}
          </div>

          <div style={{ color: '#333333', fontSize: 12, fontWeight: 400, marginTop: 20, lineHeight: '20px', maxWidth: 300, margin: '20px auto 0' }}>
            Every domain registered on the internet today, surfaced live. A new one appears every ~2 seconds.
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search domains..."
            style={{
              marginTop: 24,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #2a2a2a',
              outline: 'none',
              color: '#ffffff',
              padding: '8px 0',
              width: '100%',
              maxWidth: 300,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 400,
              display: 'block',
              margin: '24px auto 0',
              textAlign: 'center',
            }}
          />

          <button
            onClick={openRandom}
            disabled={!domains.length}
            style={{
              marginTop: 16,
              background: 'none',
              border: 'none',
              color: domains.length ? '#444444' : '#222222',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 500,
              cursor: domains.length ? 'pointer' : 'default',
              padding: 0,
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => { if (domains.length) e.currentTarget.style.color = '#ffffff' }}
            onMouseLeave={e => { e.currentTarget.style.color = domains.length ? '#444444' : '#222222' }}
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
                fontSize: 22,
                fontWeight: 500,
                lineHeight: '40px',
                color: '#b0b0b0',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#b0b0b0')}
            >
              {d.domain}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
