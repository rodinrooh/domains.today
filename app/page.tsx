'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string }
type LeaderRow = { id: number; domain: string; score: number; date_added: string }

export default function Page() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [search, setSearch] = useState('')
  const lastIdRef = useRef<number>(0)

  const [tab, setTab] = useState<'feed' | 'leaderboard'>('feed')
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([])
  const [leaderLoading, setLeaderLoading] = useState(false)
  const leaderLoadedRef = useRef(false)

  useEffect(() => {
    supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('shown', true)
      .then(({ count }) => { if (count) setTotalCount(count) })

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

  useEffect(() => {
    if (tab !== 'leaderboard' || leaderLoadedRef.current) return
    leaderLoadedRef.current = true
    setLeaderLoading(true)

    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('domains')
      .select('id, domain, score, date_added')
      .eq('shown', true)
      .not('score', 'is', null)
      .eq('date_added', today)
      .order('score', { ascending: false })
      .limit(100)
      .then(async ({ data }) => {
        if (data?.length) {
          setLeaderboard(data as LeaderRow[])
        } else {
          const { data: fallback } = await supabase
            .from('domains')
            .select('id, domain, score, date_added')
            .eq('shown', true)
            .not('score', 'is', null)
            .order('score', { ascending: false })
            .limit(100)
          if (fallback?.length) setLeaderboard(fallback as LeaderRow[])
        }
        setLeaderLoading(false)
      })
  }, [tab])

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
        top: 18,
        right: 24,
        color: '#555555',
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
            Every domain registered on the internet, surfaced live. Most are freshly purchased with nothing hosted yet. A new one appears every ~2 seconds.
          </div>

          {tab === 'feed' && (
            <>
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
            </>
          )}

        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          {(['feed', 'leaderboard'] as const).map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                color: tab === t ? '#ffffff' : '#444444',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '6px 20px',
                marginLeft: i === 1 ? -1 : 0,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'feed' && (
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
        )}

        {tab === 'leaderboard' && (
          <div>
            {leaderLoading && (
              <div style={{ textAlign: 'center', color: '#333333', fontSize: 13 }}>loading...</div>
            )}
            {!leaderLoading && leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', color: '#333333', fontSize: 13 }}>no scored domains yet</div>
            )}
            {leaderboard.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  lineHeight: '32px',
                }}
              >
                <span style={{ color: '#333333', fontSize: 12, width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{ fontSize: 16, fontWeight: 500, color: '#999999', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#999999')}
                >
                  {d.domain}
                </span>
                <span style={{ color: '#333333', fontSize: 12, width: 24, flexShrink: 0 }}>
                  {d.score}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
