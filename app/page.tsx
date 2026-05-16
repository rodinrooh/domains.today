'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DomainRow = { id: number; domain: string; shown_at: string | null }
type LeaderRow = { id: number; domain: string; score: number }

function getTld(d: string) {
  const i = d.lastIndexOf('.')
  return i >= 0 ? d.slice(i) : ''
}

function getSld(d: string) {
  const i = d.lastIndexOf('.')
  return i >= 0 ? d.slice(0, i) : d
}

function formatArrived(ts: string | null) {
  if (!ts) return '---'
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}

function formatClock(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}

const AMBER = '#f5a623'
const MAX_W = 860
const LIVE_COLS = 'minmax(0, 1fr) 72px 118px 88px'
const TOP_COLS = '40px minmax(0, 1fr) 72px 68px 88px'

export default function Page() {
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [search, setSearch] = useState('')
  const [now, setNow] = useState<Date | null>(null)
  const lastIdRef = useRef<number>(0)
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const newIdsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tab, setTab] = useState<'live' | 'top'>('live')
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([])
  const [leaderLoading, setLeaderLoading] = useState(false)
  const leaderLoadedRef = useRef(false)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('shown', true)
      .then(({ count }) => { if (count) setTotalCount(count) })

    supabase
      .from('domains')
      .select('id, domain, shown_at')
      .eq('shown', true)
      .order('id', { ascending: false })
      .then(({ data }) => {
        if (data?.length) {
          setDomains(data as DomainRow[])
          lastIdRef.current = data[0].id
        }
      })

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('domains')
        .select('id, domain, shown_at')
        .eq('shown', true)
        .gt('id', lastIdRef.current)
        .order('id', { ascending: true })
      if (data?.length) {
        lastIdRef.current = data[data.length - 1].id
        const incoming = [...data].reverse() as DomainRow[]
        const ids = new Set(incoming.map(d => d.id))
        setNewIds(ids)
        if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current)
        newIdsTimerRef.current = setTimeout(() => setNewIds(new Set()), 500)
        setDomains(prev => [...incoming, ...prev])
        setTotalCount(prev => prev + data.length)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'top' || leaderLoadedRef.current) return
    leaderLoadedRef.current = true
    setLeaderLoading(true)
    supabase
      .from('domains')
      .select('id, domain, score')
      .eq('shown', true)
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data?.length) setLeaderboard(data as LeaderRow[])
        setLeaderLoading(false)
      })
  }, [tab])

  const filtered = search
    ? domains.filter(d => d.domain.includes(search.toLowerCase()))
    : domains

  const filteredLeaderWithRank = leaderboard
    .map((d, i) => ({ d, rank: i + 1 }))
    .filter(({ d }) => !search || d.domain.includes(search.toLowerCase()))

  const displayCount = search
    ? (tab === 'live' ? filtered.length : filteredLeaderWithRank.length)
    : totalCount

  const gridCols = tab === 'live' ? LIVE_COLS : TOP_COLS

  return (
    <main style={{ background: '#111111', minHeight: '100vh' }}>

      {/* Fixed blurred header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: 'rgba(17, 17, 17, 0.82)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid #222',
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '16px 24px 0' }}>

          {/* Title + clock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>
                INTERNET AIRPORT
              </div>
              <div style={{ color: AMBER, fontSize: 10, letterSpacing: '0.2em', marginTop: 4 }}>
                INTERNATIONAL ARRIVALS
              </div>
              <div style={{ color: '#666', fontSize: 10, letterSpacing: '0.12em', marginTop: 3 }}>
                {displayCount.toLocaleString()}{search ? ' MATCHING' : ' ARRIVALS'}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: 2 }}>
              <div style={{ color: AMBER, fontSize: 14, letterSpacing: '0.06em', fontWeight: 700 }}>
                {now ? formatClock(now) : ''}
              </div>
              <div style={{ color: '#444', fontSize: 9, letterSpacing: '0.18em', marginTop: 3 }}>
                PST
              </div>
            </div>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SEARCH ARRIVALS..."
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #252525',
              outline: 'none',
              color: '#aaaaaa',
              fontSize: 11,
              letterSpacing: '0.08em',
              padding: '5px 0',
              fontFamily: 'inherit',
            }}
          />

          {/* Tabs */}
          <div style={{ display: 'flex', marginTop: 2 }}>
            {(['live', 'top'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? `2px solid ${AMBER}` : '2px solid transparent',
                  color: tab === t ? '#ffffff' : '#3a3a3a',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  cursor: 'pointer',
                  padding: '8px 16px 5px',
                }}
              >
                {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Centered content */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', paddingTop: 148 }}>

        {/* Sticky column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          padding: '0 24px',
          background: '#141414',
          borderBottom: '1px solid #2a2a2a',
          position: 'sticky',
          top: 148,
          zIndex: 9,
        }}>
          {tab === 'live' ? (
            <>
              <ColHead>DOMAIN</ColHead>
              <ColHead>TLD</ColHead>
              <ColHead align="right">ARRIVED (PST)</ColHead>
              <ColHead align="right">STATUS</ColHead>
            </>
          ) : (
            <>
              <ColHead align="right">#</ColHead>
              <ColHead style={{ paddingLeft: 12 }}>DOMAIN</ColHead>
              <ColHead>TLD</ColHead>
              <ColHead align="right">SCORE</ColHead>
              <ColHead align="right">STATUS</ColHead>
            </>
          )}
        </div>

        {/* Live arrivals — all of filtered, no cap */}
        {tab === 'live' && filtered.map(d => (
          <div
            key={d.id}
            className={`arrivals-row${newIds.has(d.id) ? ' flip-in' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: LIVE_COLS,
              padding: '0 24px',
              borderBottom: '1px solid #191919',
              height: 32,
              alignItems: 'center',
            }}
          >
            <span
              className="domain-cell"
              onClick={() => window.open(`https://${d.domain}`, '_blank')}
              style={{ color: '#888', fontSize: 13, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}
            >
              {getSld(d.domain)}
            </span>
            <span style={{ color: AMBER, fontSize: 12 }}>{getTld(d.domain)}</span>
            <span style={{ color: '#444', fontSize: 11, textAlign: 'right' }}>{formatArrived(d.shown_at)}</span>
            <span style={{ color: AMBER, fontSize: 10, letterSpacing: '0.08em', textAlign: 'right' }}>ARRIVED</span>
          </div>
        ))}

        {/* Top arrivals */}
        {tab === 'top' && (
          <>
            {leaderLoading && (
              <div style={{ color: '#333', fontSize: 11, padding: '32px', textAlign: 'center', letterSpacing: '0.12em' }}>
                LOADING...
              </div>
            )}
            {!leaderLoading && filteredLeaderWithRank.length === 0 && (
              <div style={{ color: '#333', fontSize: 11, padding: '32px', textAlign: 'center', letterSpacing: '0.12em' }}>
                NO DATA
              </div>
            )}
            {filteredLeaderWithRank.map(({ d, rank }) => (
              <div
                key={d.id}
                className="arrivals-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: TOP_COLS,
                  padding: '0 24px',
                  borderBottom: '1px solid #191919',
                  height: 32,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#333', fontSize: 11, textAlign: 'right' }}>{rank}</span>
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{ color: '#888', fontSize: 13, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 12, paddingRight: 8 }}
                >
                  {getSld(d.domain)}
                </span>
                <span style={{ color: AMBER, fontSize: 12 }}>{getTld(d.domain)}</span>
                <span style={{ color: AMBER, fontSize: 12, textAlign: 'right' }}>{d.score}</span>
                <span style={{ color: AMBER, fontSize: 10, letterSpacing: '0.08em', textAlign: 'right' }}>ARRIVED</span>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  )
}

function ColHead({ children, align = 'left', style }: { children: React.ReactNode; align?: 'left' | 'right'; style?: React.CSSProperties }) {
  return (
    <div style={{
      color: '#333333',
      fontSize: 9,
      letterSpacing: '0.14em',
      padding: '7px 0',
      textAlign: align,
      ...style,
    }}>
      {children}
    </div>
  )
}
