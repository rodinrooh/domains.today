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
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatClock(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

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

  // Clock
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Feed + polling
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

  // Leaderboard
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
  const visible = filtered.slice(0, 50)

  const filteredLeaderWithRank = leaderboard
    .map((d, i) => ({ d, rank: i + 1 }))
    .filter(({ d }) => !search || d.domain.includes(search.toLowerCase()))

  const AMBER = '#f5a623'
  const LIVE_COLS = 'minmax(0, 1fr) 80px 100px 100px'
  const TOP_COLS = '44px minmax(0, 1fr) 80px 80px 100px'
  const gridCols = tab === 'live' ? LIVE_COLS : TOP_COLS

  const headerHeight = 152

  return (
    <main style={{ background: '#111111', minHeight: '100vh' }}>

      {/* Fixed header */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        background: '#111111',
        borderBottom: '1px solid #1e1e1e',
        padding: '16px 24px 0',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 700, letterSpacing: '0.05em' }}>
              INTERNET AIRPORT
            </div>
            <div style={{ color: AMBER, fontSize: 11, letterSpacing: '0.12em', marginTop: 3 }}>
              INTERNATIONAL ARRIVALS
            </div>
            <div style={{ color: '#888888', fontSize: 11, letterSpacing: '0.08em', marginTop: 2 }}>
              {totalCount.toLocaleString()} ARRIVALS
            </div>
          </div>
          <div style={{ color: AMBER, fontSize: 13, letterSpacing: '0.05em', paddingTop: 2, minWidth: 80, textAlign: 'right' }}>
            {now ? formatClock(now) : ''}
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search arrivals..."
          style={{
            marginTop: 12,
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #2a2a2a',
            outline: 'none',
            color: '#cccccc',
            fontSize: 12,
            letterSpacing: '0.04em',
            padding: '6px 0',
            fontFamily: 'inherit',
          }}
        />

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginTop: 4 }}>
          {(['live', 'top'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? `2px solid ${AMBER}` : '2px solid transparent',
                color: tab === t ? '#ffffff' : '#444444',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                padding: '8px 16px 6px',
              }}
            >
              {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: headerHeight }}>

        {/* Column header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 0,
          padding: '0 24px',
          background: '#161616',
          borderBottom: '1px solid #333',
        }}>
          {tab === 'live' ? (
            <>
              <ColHead>DOMAIN</ColHead>
              <ColHead align="left">TLD</ColHead>
              <ColHead align="right">ARRIVED</ColHead>
              <ColHead align="right">STATUS</ColHead>
            </>
          ) : (
            <>
              <ColHead align="right">#</ColHead>
              <ColHead>DOMAIN</ColHead>
              <ColHead align="left">TLD</ColHead>
              <ColHead align="right">SCORE</ColHead>
              <ColHead align="right">STATUS</ColHead>
            </>
          )}
        </div>

        {/* Rows */}
        {tab === 'live' && visible.map(d => (
          <div
            key={d.id}
            className={`arrivals-row${newIds.has(d.id) ? ' flip-in' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: LIVE_COLS,
              gap: 0,
              padding: '0 24px',
              borderBottom: '1px solid #1a1a1a',
              height: 32,
              alignItems: 'center',
            }}
          >
            <span
              className="domain-cell"
              onClick={() => window.open(`https://${d.domain}`, '_blank')}
              style={{ color: '#999999', fontSize: 13, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {getSld(d.domain)}
            </span>
            <span style={{ color: AMBER, fontSize: 12 }}>{getTld(d.domain)}</span>
            <span style={{ color: '#555555', fontSize: 12, textAlign: 'right' }}>{formatArrived(d.shown_at)}</span>
            <span style={{ color: AMBER, fontSize: 11, letterSpacing: '0.06em', textAlign: 'right' }}>ARRIVED</span>
          </div>
        ))}

        {tab === 'top' && (
          <>
            {leaderLoading && (
              <div style={{ color: '#444', fontSize: 12, padding: '24px', textAlign: 'center', letterSpacing: '0.08em' }}>
                LOADING...
              </div>
            )}
            {!leaderLoading && filteredLeaderWithRank.length === 0 && (
              <div style={{ color: '#444', fontSize: 12, padding: '24px', textAlign: 'center', letterSpacing: '0.08em' }}>
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
                  gap: 0,
                  padding: '0 24px',
                  borderBottom: '1px solid #1a1a1a',
                  height: 32,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#444444', fontSize: 11, textAlign: 'right' }}>{rank}</span>
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{ color: '#999999', fontSize: 13, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 12 }}
                >
                  {getSld(d.domain)}
                </span>
                <span style={{ color: AMBER, fontSize: 12 }}>{getTld(d.domain)}</span>
                <span style={{ color: AMBER, fontSize: 12, textAlign: 'right' }}>{d.score}</span>
                <span style={{ color: AMBER, fontSize: 11, letterSpacing: '0.06em', textAlign: 'right' }}>ARRIVED</span>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  )
}

function ColHead({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <div style={{
      color: '#444444',
      fontSize: 10,
      letterSpacing: '0.1em',
      padding: '8px 0',
      textAlign: align,
    }}>
      {children}
    </div>
  )
}
