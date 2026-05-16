'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
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

const AMBER       = '#f59e0b'
const BOARD_BG    = '#0e1220'
const BORDER      = '#2a3d58'
const ROW_DIV     = '#182030'
const COL_HEAD_BG = '#111828'
const MAX_W       = 860
const HDR         = 128
const GAP         = 20
const MAX_DISPLAY = 200
const MAX_STATE   = 500

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

  const [searchResults, setSearchResults] = useState<DomainRow[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      .limit(MAX_STATE)
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
        setDomains(prev => [...incoming, ...prev].slice(0, MAX_STATE))
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

  // Server-side search (debounced 350ms)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!search) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('domains')
        .select('id, domain, shown_at')
        .eq('shown', true)
        .ilike('domain', `%${search}%`)
        .order('id', { ascending: false })
        .limit(500)
      setSearchResults((data as DomainRow[]) ?? [])
      setSearching(false)
    }, 350)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  const liveRows = useMemo(
    () => search ? searchResults : domains.slice(0, MAX_DISPLAY),
    [search, searchResults, domains]
  )

  const filteredLeader = useMemo(
    () => leaderboard
      .map((d, i) => ({ d, rank: i + 1 }))
      .filter(({ d }) => !search || d.domain.toLowerCase().includes(search.toLowerCase())),
    [search, leaderboard]
  )

  const displayCount = search
    ? (tab === 'live' ? (searching ? totalCount : searchResults.length) : filteredLeader.length)
    : totalCount

  const gridCols = tab === 'live' ? LIVE_COLS : TOP_COLS

  return (
    <main style={{ background: '#0c1018', minHeight: '100vh' }}>

      {/* Fixed blurred header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(12,16,24,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '16px 32px 0' }}>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#e8edf5', fontSize: 22, letterSpacing: '0.12em', lineHeight: 1, fontWeight: 700 }}>
                INTERNET AIRPORT
              </div>
              <div style={{ color: AMBER, fontSize: 11, letterSpacing: '0.22em', marginTop: 6 }}>
                INTERNATIONAL ARRIVALS
              </div>
              <div style={{ color: '#4d6a88', fontSize: 10, letterSpacing: '0.14em', marginTop: 5 }}>
                {searching
                  ? 'SEARCHING...'
                  : `${displayCount.toLocaleString()}${search ? ' MATCHING' : ' ARRIVALS'}`}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: 1 }}>
              <div style={{ color: AMBER, fontSize: 18, letterSpacing: '0.06em' }}>
                {now ? formatClock(now) : ' '}
              </div>
              <div style={{ color: '#3d5570', fontSize: 9, letterSpacing: '0.22em', marginTop: 5 }}>
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
              borderBottom: `1px solid #2a3d58`,
              outline: 'none',
              color: '#7090b0',
              fontSize: 11,
              letterSpacing: '0.1em',
              padding: '6px 0 7px',
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
                  color: tab === t ? '#e8edf5' : '#3d5570',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  cursor: 'pointer',
                  padding: '9px 18px 6px',
                }}
              >
                {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Centered content */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', paddingTop: HDR + GAP, paddingBottom: 60 }}>

        {/* Board panel — overflow:clip allows position:sticky inside while still clipping visually */}
        <div style={{
          margin: '0 32px',
          border: `1px solid ${BORDER}`,
          borderRadius: 8,
          overflow: 'clip',
          background: BOARD_BG,
          boxShadow: '0 0 0 1px rgba(42,61,88,0.3), 0 8px 32px rgba(0,0,0,0.4)',
        }}>

          {/* Sticky column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            padding: '0 16px',
            background: COL_HEAD_BG,
            borderBottom: `1px solid ${BORDER}`,
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
          {tab === 'live' && liveRows.map((d, i) => {
            const isNew = newIds.has(d.id)
            const recent = !isNew && i < 12
            return (
              <div
                key={d.id}
                className={`arrivals-row${isNew ? ' flip-in' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: LIVE_COLS,
                  padding: '0 18px',
                  borderBottom: `1px solid ${ROW_DIV}`,
                  height: 36,
                  alignItems: 'center',
                  background: BOARD_BG,
                }}
              >
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{
                    color: isNew ? '#f0f4ff' : recent ? '#a0bcd0' : '#607888',
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
                <span style={{
                  color: isNew ? AMBER : recent ? '#c09040' : '#7a6035',
                  fontSize: 13,
                  letterSpacing: '0.04em',
                }}>
                  {getTld(d.domain)}
                </span>
                <span style={{
                  color: isNew ? '#7090b0' : recent ? '#5880a0' : '#3d5870',
                  fontSize: 12,
                  textAlign: 'right',
                  letterSpacing: '0.03em',
                }}>
                  {formatArrived(d.shown_at)}
                </span>
                <span style={{
                  color: isNew ? AMBER : recent ? '#b08030' : '#6a5028',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textAlign: 'right',
                }}>
                  ARRIVED
                </span>
              </div>
            )
          })}

          {tab === 'live' && liveRows.length === 0 && !searching && (
            <div style={{ color: '#3d5570', fontSize: 11, padding: '36px', textAlign: 'center', letterSpacing: '0.14em' }}>
              {search ? 'NO MATCHES' : 'LOADING...'}
            </div>
          )}

          {tab === 'live' && searching && (
            <div style={{ color: '#3d5570', fontSize: 11, padding: '36px', textAlign: 'center', letterSpacing: '0.14em' }}>
              SEARCHING...
            </div>
          )}

          {/* Top rows */}
          {tab === 'top' && (
            <>
              {leaderLoading && (
                <div style={{ color: '#3d5570', fontSize: 11, padding: '36px', textAlign: 'center', letterSpacing: '0.14em' }}>
                  LOADING...
                </div>
              )}
              {!leaderLoading && filteredLeader.length === 0 && (
                <div style={{ color: '#3d5570', fontSize: 11, padding: '36px', textAlign: 'center', letterSpacing: '0.14em' }}>
                  {search ? 'NO MATCHES' : 'NO DATA'}
                </div>
              )}
              {filteredLeader.map(({ d, rank }) => (
                <div
                  key={d.id}
                  className="arrivals-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: TOP_COLS,
                    padding: '0 18px',
                    borderBottom: `1px solid ${ROW_DIV}`,
                    height: 36,
                    alignItems: 'center',
                    background: BOARD_BG,
                  }}
                >
                  <span style={{ color: '#3d5570', fontSize: 11, textAlign: 'right', letterSpacing: '0.04em' }}>{rank}</span>
                  <span
                    className="domain-cell"
                    onClick={() => window.open(`https://${d.domain}`, '_blank')}
                    style={{
                      color: '#a0bcd0',
                      fontSize: 14,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingLeft: 12,
                      paddingRight: 12,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {getSld(d.domain)}
                  </span>
                  <span style={{ color: '#c09040', fontSize: 13, letterSpacing: '0.04em' }}>{getTld(d.domain)}</span>
                  <span style={{ color: AMBER, fontSize: 13, textAlign: 'right', letterSpacing: '0.04em' }}>{d.score}</span>
                  <span style={{ color: '#b08030', fontSize: 11, letterSpacing: '0.1em', textAlign: 'right' }}>ARRIVED</span>
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
      color: '#3d5570',
      fontSize: 9,
      letterSpacing: '0.18em',
      padding: '9px 0',
      textAlign: align,
      ...style,
    }}>
      {children}
    </div>
  )
}
