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
// Header height (compact: title block ~50px + search ~30px + tabs ~28px + padding 14 = ~122px)
const HDR = 122
const GAP = 20 // visual gap between header and board

const LIVE_COLS = 'minmax(0,1fr) 90px 130px 90px'
const TOP_COLS  = '36px minmax(0,1fr) 90px 70px 90px'

export default function Page() {
  const [domains, setDomains]     = useState<DomainRow[]>([])
  const [totalCount, setTotal]    = useState<number>(0)
  const [search, setSearch]       = useState('')
  const [now, setNow]             = useState<Date | null>(null)
  const lastIdRef                 = useRef<number>(0)
  const [newIds, setNewIds]       = useState<Set<number>>(new Set())
  const newIdsTimerRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tab, setTab]             = useState<'live' | 'top'>('live')
  const [leaderboard, setLeader]  = useState<LeaderRow[]>([])
  const [leaderLoading, setLL]    = useState(false)
  const leaderLoadedRef           = useRef(false)

  // Clock
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Feed
  useEffect(() => {
    supabase
      .from('domains')
      .select('*', { count: 'exact', head: true })
      .eq('shown', true)
      .then(({ count }) => { if (count) setTotal(count) })

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
        newIdsTimerRef.current = setTimeout(() => setNewIds(new Set()), 800)
        setDomains(prev => [...incoming, ...prev])
        setTotal(prev => prev + data.length)
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
    setLL(true)
    supabase
      .from('domains')
      .select('id, domain, score')
      .eq('shown', true)
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data?.length) setLeader(data as LeaderRow[])
        setLL(false)
      })
  }, [tab])

  const filtered = search
    ? domains.filter(d => d.domain.includes(search.toLowerCase()))
    : domains

  const filteredLeader = leaderboard
    .map((d, i) => ({ d, rank: i + 1 }))
    .filter(({ d }) => !search || d.domain.includes(search.toLowerCase()))

  const displayCount = search
    ? (tab === 'live' ? filtered.length : filteredLeader.length)
    : totalCount

  const gridCols = tab === 'live' ? LIVE_COLS : TOP_COLS

  return (
    <main style={{ background: '#111111', minHeight: '100vh' }}>

      {/* ── Fixed blurred header ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(15,15,15,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '14px 28px 0' }}>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#fff', fontSize: 22, letterSpacing: '0.12em', lineHeight: 1 }}>
                INTERNET AIRPORT
              </div>
              <div style={{ color: AMBER, fontSize: 11, letterSpacing: '0.22em', marginTop: 5 }}>
                INTERNATIONAL ARRIVALS
              </div>
              <div style={{ color: '#555', fontSize: 10, letterSpacing: '0.14em', marginTop: 4 }}>
                {displayCount.toLocaleString()}{search ? ' MATCHING' : ' ARRIVALS'}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: 1 }}>
              <div style={{ color: AMBER, fontSize: 18, letterSpacing: '0.06em' }}>
                {now ? formatClock(now) : ' '}
              </div>
              <div style={{ color: '#444', fontSize: 9, letterSpacing: '0.22em', marginTop: 4 }}>
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
              display: 'block',
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #252525',
              outline: 'none',
              color: '#aaa',
              fontSize: 11,
              letterSpacing: '0.1em',
              padding: '5px 0 6px',
              fontFamily: 'inherit',
            }}
          />

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {(['live', 'top'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: tab === t ? `2px solid ${AMBER}` : '2px solid transparent',
                  color: tab === t ? '#fff' : '#3a3a3a',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  cursor: 'pointer',
                  padding: '8px 18px 5px',
                }}
              >
                {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Centered content ── */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', paddingTop: HDR + GAP, paddingBottom: 60 }}>

        {/* Board: visually distinct panel */}
        <div style={{
          margin: '0 28px',
          border: '1px solid #232323',
          borderRadius: 2,
          overflow: 'hidden',
        }}>

          {/* Sticky column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            padding: '0 16px',
            background: '#181818',
            borderBottom: '1px solid #2e2e2e',
            position: 'sticky',
            top: HDR,
            zIndex: 9,
          }}>
            {tab === 'live' ? (
              <>
                <ColHead>DOMAIN</ColHead>
                <ColHead>GATE</ColHead>
                <ColHead align="right">ARRIVED (PST)</ColHead>
                <ColHead align="right">STATUS</ColHead>
              </>
            ) : (
              <>
                <ColHead align="right">#</ColHead>
                <ColHead style={{ paddingLeft: 12 }}>DOMAIN</ColHead>
                <ColHead>GATE</ColHead>
                <ColHead align="right">SCORE</ColHead>
                <ColHead align="right">STATUS</ColHead>
              </>
            )}
          </div>

          {/* Live rows */}
          {tab === 'live' && filtered.map((d, i) => {
            const isNew = newIds.has(d.id)
            const dimmed = i > 2 && !isNew
            return (
              <div
                key={d.id}
                className={`arrivals-row${isNew ? ' flip-in' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: LIVE_COLS,
                  padding: '0 16px',
                  borderBottom: '1px solid #181818',
                  height: 34,
                  alignItems: 'center',
                  background: '#111111',
                }}
              >
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{
                    color: isNew ? '#fff' : dimmed ? '#666' : '#bbb',
                    fontSize: 14,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: 12,
                    letterSpacing: '0.02em',
                  }}
                >
                  {getSld(d.domain)}
                </span>
                <span style={{ color: isNew ? AMBER : dimmed ? '#4a3a1a' : '#8a6520', fontSize: 13, letterSpacing: '0.04em' }}>
                  {getTld(d.domain)}
                </span>
                <span style={{ color: isNew ? '#999' : dimmed ? '#383838' : '#555', fontSize: 12, textAlign: 'right', letterSpacing: '0.03em' }}>
                  {formatArrived(d.shown_at)}
                </span>
                <span style={{ color: isNew ? AMBER : dimmed ? '#3a3020' : '#6a5010', fontSize: 11, letterSpacing: '0.1em', textAlign: 'right' }}>
                  ARRIVED
                </span>
              </div>
            )
          })}

          {/* Top rows */}
          {tab === 'top' && (
            <>
              {leaderLoading && (
                <div style={{ color: '#333', fontSize: 11, padding: '32px', textAlign: 'center', letterSpacing: '0.14em', background: '#111' }}>
                  LOADING...
                </div>
              )}
              {!leaderLoading && filteredLeader.length === 0 && (
                <div style={{ color: '#333', fontSize: 11, padding: '32px', textAlign: 'center', letterSpacing: '0.14em', background: '#111' }}>
                  NO DATA
                </div>
              )}
              {filteredLeader.map(({ d, rank }) => (
                <div
                  key={d.id}
                  className="arrivals-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: TOP_COLS,
                    padding: '0 16px',
                    borderBottom: '1px solid #181818',
                    height: 34,
                    alignItems: 'center',
                    background: '#111111',
                  }}
                >
                  <span style={{ color: '#333', fontSize: 11, textAlign: 'right', letterSpacing: '0.04em' }}>{rank}</span>
                  <span
                    className="domain-cell"
                    onClick={() => window.open(`https://${d.domain}`, '_blank')}
                    style={{ color: '#bbb', fontSize: 14, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: 12, paddingRight: 12, letterSpacing: '0.02em' }}
                  >
                    {getSld(d.domain)}
                  </span>
                  <span style={{ color: '#8a6520', fontSize: 13, letterSpacing: '0.04em' }}>{getTld(d.domain)}</span>
                  <span style={{ color: AMBER, fontSize: 13, textAlign: 'right', letterSpacing: '0.04em' }}>{d.score}</span>
                  <span style={{ color: '#6a5010', fontSize: 11, letterSpacing: '0.1em', textAlign: 'right' }}>ARRIVED</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function ColHead({ children, align = 'left', style }: {
  children: React.ReactNode
  align?: 'left' | 'right'
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      color: '#666',
      fontSize: 9,
      letterSpacing: '0.18em',
      padding: '8px 0',
      textAlign: align,
      ...style,
    }}>
      {children}
    </div>
  )
}
