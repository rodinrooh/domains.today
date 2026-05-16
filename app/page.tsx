'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string }
type LeaderRow = { id: number; domain: string; score: number; date_added: string }

const FEED_BLURB = 'Every domain registered on the internet, surfaced live. Most are freshly purchased with nothing hosted yet. A new one appears every ~2 seconds.'
const LEADER_BLURB = 'The highest-scoring domains from the latest batch, ranked by name quality. Short names, real words, and clean TLDs score highest. Updated once daily.'

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

  const filteredLeaderWithIndex = leaderboard
    .map((d, i) => ({ d, rank: i + 1 }))
    .filter(({ d }) => !search || d.domain.includes(search.toLowerCase()))

  const currentPool = tab === 'leaderboard'
    ? filteredLeaderWithIndex.map(({ d }) => d)
    : filtered

  function openRandom() {
    if (!currentPool.length) return
    const pick = currentPool[Math.floor(Math.random() * currentPool.length)]
    window.open(`https://${pick.domain}`, '_blank')
  }

  const displayCount = search ? currentPool.length : totalCount

  return (
    <main style={{ background: '#000000', minHeight: '100vh' }}>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: '#000000',
        paddingTop: 24,
        paddingBottom: 12,
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ffffff',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.5px',
        }}>
          domains.today
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
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
      </div>

      <div style={{
        position: 'fixed',
        top: 18,
        right: 24,
        color: '#555555',
        fontSize: 11,
        fontWeight: 400,
        zIndex: 11,
        lineHeight: '16px',
        textAlign: 'right',
      }}>
        live since<br />May 15, 11:59 PM
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '108px 24px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48, marginTop: 20 }}>

          <div style={{ fontSize: 88, fontWeight: 800, color: '#ffffff', lineHeight: 1, letterSpacing: '-4px' }}>
            {displayCount.toLocaleString()}
          </div>

          <div style={{ color: '#444444', fontSize: 13, fontWeight: 500, marginTop: 12, letterSpacing: '0.01em' }}>
            {search ? 'domains matching your search' : 'domains registered'}
          </div>

          <div style={{ color: '#555555', fontSize: 12, fontWeight: 400, lineHeight: '20px', maxWidth: 300, margin: '20px auto 0' }}>
            {tab === 'feed' ? FEED_BLURB : LEADER_BLURB}
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search domains..."
            style={{
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
            disabled={!currentPool.length}
            style={{
              marginTop: 10,
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: currentPool.length ? '#666666' : '#2a2a2a',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 400,
              cursor: currentPool.length ? 'pointer' : 'default',
              padding: '7px 24px',
              display: 'inline-block',
              width: 'auto',
              maxWidth: 160,
            }}
            onMouseEnter={e => { if (currentPool.length) { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#555555' } }}
            onMouseLeave={e => { e.currentTarget.style.color = currentPool.length ? '#666666' : '#2a2a2a'; e.currentTarget.style.borderColor = '#2a2a2a' }}
          >
            random
          </button>

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
            {!leaderLoading && filteredLeaderWithIndex.length === 0 && (
              <div style={{ textAlign: 'center', color: '#333333', fontSize: 13 }}>no scored domains yet</div>
            )}
            {filteredLeaderWithIndex.map(({ d, rank }) => (
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
                  {rank}
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
