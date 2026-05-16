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
    hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}
function formatClock(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit',
    timeZone: 'America/Los_Angeles',
  })
}

// ── Palette ────────────────────────────────────────────────────────────────
const AMBER      = '#f0b020'   // primary — ALL domain rows
const AMBER_GATE = '#c88010'   // gate column
const AMBER_NEW  = '#f5cc40'   // newest row during animation
const WHITE_NEW  = '#fffaf0'   // newest domain text during animation

const PAGE_BG    = '#111111'   // outer page
const HDR_BG     = 'rgba(14,14,14,0.96)'
const BOARD_GRAY = '#3c3c3c'   // board outer — the gray "frame" that peeks as gutter
const ROW_BG     = '#141414'   // very dark row tiles
const COL_HDR_BG = '#2a2a2a'   // column header strip

const MAX_W      = 1000
const HDR        = 168   // fixed header height px
const GAP        = 32

// Grid: TIME | DOMAIN | GATE | STATUS
const LIVE_COLS = '148px minmax(0,1fr) 88px 96px'
// Grid: # | DOMAIN | GATE | SCORE | STATUS
const TOP_COLS  = '40px minmax(0,1fr) 88px 72px 96px'

const MAX_DISPLAY = 200
const MAX_STATE   = 500

export default function Page() {
  const [domains, setDomains]   = useState<DomainRow[]>([])
  const [totalCount, setTotal]  = useState(0)
  const [search, setSearch]     = useState('')
  const [now, setNow]           = useState<Date | null>(null)
  const lastIdRef               = useRef(0)
  const [newIds, setNewIds]     = useState<Set<number>>(new Set())
  const newIdsTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [tab, setTab]           = useState<'live' | 'top'>('live')
  const [leaderboard, setLeader]= useState<LeaderRow[]>([])
  const [leaderLoading, setLL]  = useState(false)
  const leaderLoadedRef         = useRef(false)

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
    supabase.from('domains').select('*', { count: 'exact', head: true }).eq('shown', true)
      .then(({ count }) => { if (count) setTotal(count) })

    supabase.from('domains').select('id, domain, shown_at').eq('shown', true)
      .order('id', { ascending: false }).limit(MAX_STATE)
      .then(({ data }) => {
        if (data?.length) { setDomains(data as DomainRow[]); lastIdRef.current = data[0].id }
      })

    const iv = setInterval(async () => {
      const { data } = await supabase.from('domains').select('id, domain, shown_at')
        .eq('shown', true).gt('id', lastIdRef.current).order('id', { ascending: true })
      if (data?.length) {
        lastIdRef.current = data[data.length - 1].id
        const incoming = [...data].reverse() as DomainRow[]
        const ids = new Set(incoming.map(d => d.id))
        setNewIds(ids)
        if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current)
        newIdsTimerRef.current = setTimeout(() => setNewIds(new Set()), 1000)
        setDomains(prev => [...incoming, ...prev].slice(0, MAX_STATE))
        setTotal(prev => prev + data.length)
      }
    }, 1000)

    return () => {
      clearInterval(iv)
      if (newIdsTimerRef.current) clearTimeout(newIdsTimerRef.current)
    }
  }, [])

  // Leaderboard
  useEffect(() => {
    if (tab !== 'top' || leaderLoadedRef.current) return
    leaderLoadedRef.current = true; setLL(true)
    supabase.from('domains').select('id, domain, score').eq('shown', true)
      .not('score', 'is', null).order('score', { ascending: false }).limit(100)
      .then(({ data }) => { if (data?.length) setLeader(data as LeaderRow[]); setLL(false) })
  }, [tab])

  // Server-side search (350ms debounce)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!search) { setSearchResults([]); setSearching(false); return }
    setSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      const { data } = await supabase.from('domains').select('id, domain, shown_at')
        .eq('shown', true).ilike('domain', `%${search}%`)
        .order('id', { ascending: false }).limit(500)
      setSearchResults((data as DomainRow[]) ?? [])
      setSearching(false)
    }, 350)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [search])

  const liveRows = useMemo(
    () => search ? searchResults : domains.slice(0, MAX_DISPLAY),
    [search, searchResults, domains]
  )
  const filteredLeader = useMemo(
    () => leaderboard.map((d, i) => ({ d, rank: i + 1 }))
      .filter(({ d }) => !search || d.domain.toLowerCase().includes(search.toLowerCase())),
    [search, leaderboard]
  )

  const displayCount = search
    ? (tab === 'live' ? (searching ? totalCount : searchResults.length) : filteredLeader.length)
    : totalCount

  return (
    <main style={{ background: PAGE_BG, minHeight: '100vh' }}>

      {/* ── Fixed header ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
        background: HDR_BG,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: `1px solid #282828`,
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '20px 40px 0' }}>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#f5f0e8', fontSize: 28, letterSpacing: '0.12em', lineHeight: 1, fontWeight: 700 }}>
                INTERNET AIRPORT
              </div>
              <div style={{ color: AMBER, fontSize: 11, letterSpacing: '0.3em', marginTop: 8 }}>
                INTERNATIONAL ARRIVALS
              </div>
              <div style={{ color: '#4a4a4a', fontSize: 10, letterSpacing: '0.18em', marginTop: 6 }}>
                {searching ? 'SEARCHING...' : `${displayCount.toLocaleString()}${search ? ' MATCHING' : ' ARRIVALS'}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: AMBER_NEW, fontSize: 24, letterSpacing: '0.06em', fontWeight: 700 }}>
                {now ? formatClock(now) : ' '}
              </div>
              <div style={{ color: '#3a3a3a', fontSize: 9, letterSpacing: '0.3em', marginTop: 6 }}>
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
              display: 'block', marginTop: 18, width: '100%',
              background: 'transparent', border: 'none',
              borderBottom: `1px solid #282828`,
              outline: 'none', color: '#777',
              fontSize: 11, letterSpacing: '0.12em',
              padding: '6px 0 8px', fontFamily: 'inherit',
            }}
          />

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {(['live', 'top'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'transparent', border: 'none',
                borderBottom: tab === t ? `2px solid ${AMBER}` : '2px solid transparent',
                color: tab === t ? '#f5f0e8' : '#3a3a3a',
                fontFamily: 'inherit', fontSize: 10,
                letterSpacing: '0.2em', cursor: 'pointer',
                padding: '10px 22px 7px',
              }}>
                {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', paddingTop: HDR + GAP, paddingBottom: 80 }}>
        <div style={{ margin: '0 40px' }}>

          {/* ── Board outer shell — gray frame ── */}
          <div style={{
            background: BOARD_GRAY,
            borderRadius: 8,
            overflow: 'clip',
            border: `2px solid #484848`,
            boxShadow: '0 8px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
            padding: '6px 6px 4px',
          }}>

            {/* Column header strip — sits on gray board bg */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: tab === 'live' ? LIVE_COLS : TOP_COLS,
              padding: '0 20px',
              marginBottom: '6px',
              background: COL_HDR_BG,
              borderRadius: 4,
              position: 'sticky',
              top: HDR,
              zIndex: 9,
            }}>
              {tab === 'live' ? (
                <>
                  <ColHead>ARRIVED (PST)</ColHead>
                  <ColHead style={{ paddingLeft: 24 }}>DOMAIN</ColHead>
                  <ColHead>GATE</ColHead>
                  <ColHead align="right">STATUS</ColHead>
                </>
              ) : (
                <>
                  <ColHead align="center">#</ColHead>
                  <ColHead style={{ paddingLeft: 16 }}>DOMAIN</ColHead>
                  <ColHead>GATE</ColHead>
                  <ColHead align="right">SCORE</ColHead>
                  <ColHead align="right">STATUS</ColHead>
                </>
              )}
            </div>

            {/* ── Live rows ── */}
            {tab === 'live' && liveRows.map((d) => {
              const isNew = newIds.has(d.id)
              return (
                <div
                  key={d.id}
                  className={`arrivals-row${isNew ? ' flip-in' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: LIVE_COLS,
                    padding: '0 20px',
                    marginBottom: '5px',
                    height: 68,
                    alignItems: 'center',
                    background: ROW_BG,
                    borderRadius: 4,
                    border: `1px solid #222`,
                  }}
                >
                  {/* Time column — boxed style */}
                  <div>
                    <span className="time-cell" style={isNew ? { borderColor: '#5a4a20', color: '#f0f0f0' } : {}}>
                      {formatArrived(d.shown_at)}
                    </span>
                  </div>

                  {/* Domain — big, amber, wide letter-spacing */}
                  <span
                    className="domain-cell"
                    onClick={() => window.open(`https://${d.domain}`, '_blank')}
                    style={{
                      color: isNew ? WHITE_NEW : AMBER,
                      fontSize: 26,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingLeft: 24,
                      paddingRight: 20,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {getSld(d.domain)}
                  </span>

                  {/* Gate — TLD */}
                  <span style={{
                    color: isNew ? AMBER_NEW : AMBER_GATE,
                    fontSize: 15,
                    letterSpacing: '0.06em',
                    fontWeight: 400,
                  }}>
                    {getTld(d.domain)}
                  </span>

                  {/* Status */}
                  <span style={{
                    color: isNew ? AMBER_NEW : '#7a5a10',
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textAlign: 'right',
                  }}>
                    ARRIVED
                  </span>
                </div>
              )
            })}

            {tab === 'live' && !searching && liveRows.length === 0 && <BoardEmpty>{search ? 'NO MATCHES' : 'LOADING...'}</BoardEmpty>}
            {tab === 'live' && searching && <BoardEmpty>SEARCHING...</BoardEmpty>}

            {/* ── Top rows ── */}
            {tab === 'top' && leaderLoading && <BoardEmpty>LOADING...</BoardEmpty>}
            {tab === 'top' && !leaderLoading && filteredLeader.length === 0 && <BoardEmpty>{search ? 'NO MATCHES' : 'NO DATA'}</BoardEmpty>}
            {tab === 'top' && filteredLeader.map(({ d, rank }) => (
              <div
                key={d.id}
                className="arrivals-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: TOP_COLS,
                  padding: '0 20px',
                  marginBottom: '5px',
                  height: 68,
                  alignItems: 'center',
                  background: ROW_BG,
                  borderRadius: 4,
                  border: `1px solid #222`,
                }}
              >
                <span style={{ color: '#555', fontSize: 13, textAlign: 'center', letterSpacing: '0.04em' }}>{rank}</span>
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{
                    color: AMBER,
                    fontSize: 26,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: 16,
                    paddingRight: 20,
                    letterSpacing: '0.08em',
                  }}
                >
                  {getSld(d.domain)}
                </span>
                <span style={{ color: AMBER_GATE, fontSize: 15, letterSpacing: '0.06em' }}>{getTld(d.domain)}</span>
                <span style={{ color: AMBER_NEW, fontSize: 15, textAlign: 'right', letterSpacing: '0.04em' }}>{d.score}</span>
                <span style={{ color: '#7a5a10', fontSize: 11, letterSpacing: '0.14em', textAlign: 'right' }}>ARRIVED</span>
              </div>
            ))}

            {/* Bottom padding within gray frame */}
            <div style={{ height: 4 }} />
          </div>
        </div>
      </div>
    </main>
  )
}

function ColHead({ children, align = 'left', style }: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      color: '#666',
      fontSize: 9,
      letterSpacing: '0.22em',
      padding: '11px 0',
      textAlign: align,
      ...style,
    }}>
      {children}
    </div>
  )
}

function BoardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#444', fontSize: 12, padding: '52px',
      textAlign: 'center', letterSpacing: '0.18em',
      background: ROW_BG, borderRadius: 4, marginBottom: 5,
    }}>
      {children}
    </div>
  )
}
