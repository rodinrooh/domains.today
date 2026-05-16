'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string }

export default function Page() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [search, setSearch] = useState('')
  const lastIdRef = useRef<number>(0)

  useEffect(() => {
    // Fetch real total count (bypasses 1000-row limit)
    supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('shown', true)
      .then(({ count }) => { if (count) setTotalCount(count) })

    // Fetch recent domains for the visible list (last 1000)
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
        setTotalCount(prev => prev + data.length)
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

  const displayCount = search ? filtered.length : totalCount

  return (
    <main style={{ background: '#000000', minHeight: '100vh' }}>

      <div style={{
        position: 'fixed',
        top: 32,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        zIndex: 10,
      }}>
        domains.today
      </div>

      <div style={{
        position: 'fixed',
        top: 28,
        right: 24,
        color: '#333333',
        fontSize: 11,
        fontWeight: 400,
        zIndex: 10,
        lineHeight: '16px',
        textAlign: 'right',
      }}>
        live since<br />May 15, 11:59 PM
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '72px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48, marginTop: 40 }}>

          <div style={{ fontSize: 88, fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-4px' }}>
            {displayCount.toLocaleString()}
          </div>

          <div style={{ color: '#444444', fontSize: 13, fontWeight: 500, marginTop: 12, letterSpacing: '0.01em' }}>
            {search ? 'domains matching your search' : 'domains registered'}
          </div>

          <div style={{ color: '#333333', fontSize: 12, fontWeight: 400, marginTop: 20, lineHeight: '20px', maxWidth: 300, margin: '20px auto 0' }}>
            Every domain registered on the internet, surfaced live. A new one appears every ~2 seconds. Most are freshly purchased with nothing hosted yet.
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search domains..."
            style={{
              marginTop: 24,
              background: 'transparent',
              border: '1px solid #2a2a2a',
              outline: 'none',
              color: '#ffffff',
              padding: '10px 16px',
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
              marginTop: 10,
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: domains.length ? '#666666' : '#2a2a2a',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 400,
              cursor: domains.length ? 'pointer' : 'default',
              padding: '7px 24px',
              display: 'inline-block',
              width: 'auto',
              maxWidth: 160,
            }}
            onMouseEnter={e => { if (domains.length) { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#555555' } }}
            onMouseLeave={e => { e.currentTarget.style.color = domains.length ? '#666666' : '#2a2a2a'; e.currentTarget.style.borderColor = '#2a2a2a' }}
          >
            random
          </button>

        </div>

        <div>
          {filtered.map(d => (
            <div
              key={d.id}
              onClick={() => window.open(`https://${d.domain}`, '_blank')}
              style={{
                fontSize: 16,
                fontWeight: 500,
                lineHeight: '32px',
                color: '#999999',
                cursor: 'pointer',
                textAlign: 'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#999999')}
            >
              {d.domain}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
