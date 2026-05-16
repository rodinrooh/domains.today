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
// NEW row (during flip): white domain + bright gold accents
// ALL other rows: uniform amber — no dimming
const AMBER_BRIGHT = '#f5c030'   // new arrivals domain (white-gold)
const AMBER        = '#e8980a'   // all rows — domain name
const AMBER_GATE   = '#c87e08'   // gate (.com etc)
const AMBER_STATUS = '#a06008'   // STATUS col
const TIME_COLOR   = '#aaaaaa'   // time col — legible gray, same for all rows
const NEW_DOMAIN   = '#fff8ec'   // newest domain during animation

const PAGE_BG   = '#1e1e1e'
const HDR_BG    = 'rgba(22,22,22,0.96)'
const GUTTER_BG = '#2a2a2a'      // board outer — peeks between rows as gutter
const ROW_BG    = '#111111'      // individual row tile background
const BORDER    = '#383838'

const MAX_W      = 960
const HDR        = 162
const GAP        = 28
const MAX_DISPLAY = 200
const MAX_STATE   = 500

const LIVE_COLS = 'minmax(0,1fr) 84px 148px 96px'
const TOP_COLS  = '40px minmax(0,1fr) 84px 72px 96px'

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
        newIdsTimerRef.current = setTimeout(() => setNewIds(new Set()), 900)
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
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid #2e2e2e`,
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '18px 36px 0' }}>

          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: '#f0ede6', fontSize: 26, letterSpacing: '0.1em', lineHeight: 1, fontWeight: 700 }}>
                INTERNET AIRPORT
              </div>
              <div style={{ color: AMBER_BRIGHT, fontSize: 11, letterSpacing: '0.28em', marginTop: 7 }}>
                INTERNATIONAL ARRIVALS
              </div>
              <div style={{ color: '#555', fontSize: 10, letterSpacing: '0.16em', marginTop: 5 }}>
                {searching ? 'SEARCHING...' : `${displayCount.toLocaleString()}${search ? ' MATCHING' : ' ARRIVALS'}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: AMBER_BRIGHT, fontSize: 22, letterSpacing: '0.04em', fontWeight: 700 }}>
                {now ? formatClock(now) : ' '}
              </div>
              <div style={{ color: '#444', fontSize: 9, letterSpacing: '0.28em', marginTop: 5 }}>
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
              display: 'block', marginTop: 16, width: '100%',
              background: 'transparent', border: 'none',
              borderBottom: `1px solid #2e2e2e`,
              outline: 'none', color: '#888',
              fontSize: 11, letterSpacing: '0.12em',
              padding: '6px 0 8px', fontFamily: 'inherit',
            }}
          />

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {(['live', 'top'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: 'transparent', border: 'none',
                borderBottom: tab === t ? `2px solid ${AMBER_BRIGHT}` : '2px solid transparent',
                color: tab === t ? '#f0ede6' : '#444',
                fontFamily: 'inherit', fontSize: 10,
                letterSpacing: '0.18em', cursor: 'pointer',
                padding: '10px 20px 6px',
              }}>
                {t === 'live' ? 'LIVE ARRIVALS' : 'TOP ARRIVALS'}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: MAX_W, margin: '0 auto', paddingTop: HDR + GAP, paddingBottom: 80 }}>
        <div style={{ margin: '0 36px' }}>

          {/* Board: GUTTER_BG peeks between rows to create tile gaps */}
          <div style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            overflow: 'clip',
            background: GUTTER_BG,
            boxShadow: '0 4px 48px rgba(0,0,0,0.7)',
          }}>

            {/* Sticky column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: tab === 'live' ? LIVE_COLS : TOP_COLS,
              padding: '0 22px',
              background: '#202020',
              borderBottom: `2px solid ${GUTTER_BG}`,
              position: 'sticky', top: HDR, zIndex: 9,
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
                  <ColHead style={{ paddingLeft: 14 }}>DOMAIN</ColHead>
                  <ColHead>GATE</ColHead>
                  <ColHead align="right">SCORE</ColHead>
                  <ColHead align="right">STATUS</ColHead>
                </>
              )}
            </div>

            {/* Live rows */}
            {tab === 'live' && liveRows.map((d) => {
              const isNew = newIds.has(d.id)
              return (
                <div
                  key={d.id}
                  className={`arrivals-row${isNew ? ' flip-in' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: LIVE_COLS,
                    padding: '0 22px',
                    marginBottom: '2px',
                    height: 52,
                    alignItems: 'center',
                    background: ROW_BG,
                  }}
                >
                  <span
                    className="domain-cell"
                    onClick={() => window.open(`https://${d.domain}`, '_blank')}
                    style={{
                      color: isNew ? NEW_DOMAIN : AMBER,
                      fontSize: 20,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: 16,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {getSld(d.domain)}
                  </span>
                  <span style={{ color: isNew ? AMBER_BRIGHT : AMBER_GATE, fontSize: 14, letterSpacing: '0.06em' }}>
                    {getTld(d.domain)}
                  </span>
                  <span style={{ color: TIME_COLOR, fontSize: 12, textAlign: 'right', letterSpacing: '0.04em' }}>
                    {formatArrived(d.shown_at)}
                  </span>
                  <span style={{ color: isNew ? AMBER_BRIGHT : AMBER_STATUS, fontSize: 11, letterSpacing: '0.12em', textAlign: 'right' }}>
                    ARRIVED
                  </span>
                </div>
              )
            })}

            {tab === 'live' && !searching && liveRows.length === 0 && (
              <EmptyState>{search ? 'NO MATCHES' : 'LOADING...'}</EmptyState>
            )}
            {tab === 'live' && searching && (
              <EmptyState>SEARCHING...</EmptyState>
            )}

            {/* Top rows */}
            {tab === 'top' && leaderLoading && <EmptyState>LOADING...</EmptyState>}
            {tab === 'top' && !leaderLoading && filteredLeader.length === 0 && (
              <EmptyState>{search ? 'NO MATCHES' : 'NO DATA'}</EmptyState>
            )}
            {tab === 'top' && filteredLeader.map(({ d, rank }) => (
              <div
                key={d.id}
                className="arrivals-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: TOP_COLS,
                  padding: '0 22px',
                  marginBottom: '2px',
                  height: 52,
                  alignItems: 'center',
                  background: ROW_BG,
                }}
              >
                <span style={{ color: '#555', fontSize: 12, textAlign: 'right', letterSpacing: '0.04em' }}>{rank}</span>
                <span
                  className="domain-cell"
                  onClick={() => window.open(`https://${d.domain}`, '_blank')}
                  style={{
                    color: AMBER,
                    fontSize: 20,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingLeft: 14,
                    paddingRight: 16,
                    letterSpacing: '0.04em',
                  }}
                >
                  {getSld(d.domain)}
                </span>
                <span style={{ color: AMBER_GATE, fontSize: 14, letterSpacing: '0.06em' }}>{getTld(d.domain)}</span>
                <span style={{ color: AMBER_BRIGHT, fontSize: 14, textAlign: 'right', letterSpacing: '0.04em' }}>{d.score}</span>
                <span style={{ color: AMBER_STATUS, fontSize: 11, letterSpacing: '0.12em', textAlign: 'right' }}>ARRIVED</span>
              </div>
            ))}

          </div>
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
      color: '#555',
      fontSize: 9,
      letterSpacing: '0.2em',
      padding: '10px 0',
      textAlign: align,
      ...style,
    }}>
      {children}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      color: '#444', fontSize: 12, padding: '48px 22px',
      textAlign: 'center', letterSpacing: '0.16em', background: ROW_BG,
    }}>
      {children}
    </div>
  )
}
