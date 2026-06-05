import { useState, useEffect } from 'react'
import api from '../api'

// ── 상수 ─────────────────────────────────────────────────────────────────────
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const STATUS_STYLE = {
  won:      { label: '적중',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)' },
  lost:     { label: '미적중', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  pending:  { label: '대기',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  refunded: { label: '환불',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
}
const PRED_KO = { home: '홈 승', draw: '무승부', away: '원정 승' }
const SORT_COLS = [
  { key: 'points',     label: '포인트' },
  { key: 'net_profit', label: '순이익' },
  { key: 'bet_count',  label: '베팅수' },
  { key: 'won',        label: '적중' },
]

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const pts = (n) => (n ?? 0).toLocaleString() + 'P'
const signedPts = (n) => {
  const v = n ?? 0
  return (v >= 0 ? '+' : '') + v.toLocaleString() + 'P'
}
const winRate = (won, lost) => {
  const total = won + lost
  return total === 0 ? '-' : Math.round((won / total) * 100) + '%'
}
const shortName = (name, max = 7) => {
  const s = name ?? ''
  return s.length > max ? s.slice(0, max) + '…' : s
}

// ── 커스텀 차트 컴포넌트 ───────────────────────────────────────────────────
function HBarChart({ data, valueKey, color = '#C8A84B', formatVal }) {
  if (!data?.length) return <EmptyChart />
  const maxVal = Math.max(...data.map(d => Math.abs(d[valueKey] ?? 0)), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const val = d[valueKey] ?? 0
        const pct = Math.abs(val) / maxVal * 100
        const positive = val >= 0
        return (
          <div key={d.nickname ?? i} className="flex items-center gap-2">
            <div className="text-right flex-shrink-0" style={{ width: 80, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {shortName(d.nickname)}
            </div>
            <div className="relative flex-1 h-5 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: typeof color === 'function' ? color(val) : color,
                  transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 40}ms`,
                }}
              />
            </div>
            <div className="text-right flex-shrink-0" style={{ width: 72, fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {formatVal ? formatVal(val) : val.toLocaleString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StackedBarChart({ data }) {
  if (!data?.length) return <EmptyChart />
  const maxTotal = Math.max(...data.map(d => (d.won + d.lost + d.pending) || 1), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const total = d.won + d.lost + d.pending || 1
        const wPct = d.won    / total * 100
        const lPct = d.lost   / total * 100
        const pPct = d.pending / total * 100
        return (
          <div key={d.nickname ?? i} className="flex items-center gap-2">
            <div className="text-right flex-shrink-0" style={{ width: 80, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {shortName(d.nickname)}
            </div>
            <div className="relative flex-1 h-5 rounded overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {wPct > 0 && <div className="h-full" style={{ width: `${wPct}%`, background: '#4ade80', transition: `width 0.8s ease ${i*40}ms` }} />}
              {lPct > 0 && <div className="h-full" style={{ width: `${lPct}%`, background: '#f87171', transition: `width 0.8s ease ${i*40}ms` }} />}
              {pPct > 0 && <div className="h-full" style={{ width: `${pPct}%`, background: '#475569', transition: `width 0.8s ease ${i*40}ms` }} />}
            </div>
            <div className="text-right flex-shrink-0" style={{ width: 72, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              <span style={{ color: '#4ade80' }}>{d.won}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span style={{ color: '#f87171' }}>{d.lost}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span style={{ color: '#94a3b8' }}>{d.pending}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SignedBarChart({ data }) {
  if (!data?.length) return <EmptyChart />
  const absMax = Math.max(...data.map(d => Math.abs(d.net_profit ?? 0)), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const val = d.net_profit ?? 0
        const pct = Math.abs(val) / absMax * 50
        const pos = val >= 0
        return (
          <div key={d.nickname ?? i} className="flex items-center gap-2">
            <div className="text-right flex-shrink-0" style={{ width: 80, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {shortName(d.nickname)}
            </div>
            <div className="relative flex-1 h-5 flex items-center">
              {/* 중심선 */}
              <div className="absolute inset-y-0" style={{ left: '50%', width: 1, background: 'rgba(255,255,255,0.12)' }} />
              {/* 배경 */}
              <div className="absolute inset-0 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
              {/* 바 */}
              <div
                className="absolute h-full rounded"
                style={{
                  [pos ? 'left' : 'right']: '50%',
                  width: `${pct}%`,
                  background: pos ? 'rgba(74,222,128,0.65)' : 'rgba(248,113,113,0.65)',
                  transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i*40}ms`,
                }}
              />
            </div>
            <div
              className="text-right flex-shrink-0 font-semibold"
              style={{ width: 80, fontSize: 11, color: pos ? '#4ade80' : '#f87171' }}
            >
              {signedPts(val)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center py-8" style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
      베팅 데이터가 없습니다
    </div>
  )
}

// ── TOP 10 멀티뷰 차트 ──────────────────────────────────────────────────────
const AVATAR_BG = [
  'linear-gradient(135deg,#d4a017,#fff07a)',
  'linear-gradient(135deg,#7090b0,#b0c4de)',
  'linear-gradient(135deg,#a0622a,#cd7f32)',
  'linear-gradient(135deg,#3a7a5a,#6fcfa0)',
  'linear-gradient(135deg,#5a5ab0,#9090e0)',
  'linear-gradient(135deg,#b04040,#e08080)',
  'linear-gradient(135deg,#208060,#50c090)',
  'linear-gradient(135deg,#6050a0,#a080e0)',
  'linear-gradient(135deg,#9a4070,#e070b0)',
  'linear-gradient(135deg,#3070a0,#60b0e0)',
]

function Top10Chart({ data, onSelect }) {
  const [view, setView] = useState('bar')
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 40)
    return () => clearTimeout(t)
  }, [view])

  if (!data?.length) return <EmptyChart />

  const maxScore = Math.max(...data.map(d => d.points), 1)
  const minScore = Math.min(...data.map(d => d.points), 0)
  const barPct = (score) => 72 + ((score - minScore) / ((maxScore - minScore) || 1)) * 28
  const fmt = (n) => (n ?? 0).toLocaleString() + 'P'
  const initial = (name) => (name ?? '?')[0]

  const VIEWS = [
    { id: 'bar', label: '바 차트' },
    { id: 'card', label: '카드뷰' },
    { id: 'podium', label: '포디엄' },
  ]

  return (
    <div>
      {/* 타이틀 + 뷰 전환 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.2rem' }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#f0e6b0', letterSpacing: '0.04em' }}>포인트 TOP 10</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                background: view === v.id ? '#c9a227' : 'transparent',
                color: view === v.id ? '#1a1a2a' : '#888',
                border: `1px solid ${view === v.id ? '#c9a227' : '#444'}`,
                transition: 'all 0.15s',
              }}
            >{v.label}</button>
          ))}
        </div>
      </div>

      {/* ── 바 차트 ── */}
      {view === 'bar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {data.map((d, i) => {
            const isTop3 = i < 3
            const width = animated ? barPct(d.points) : 0
            return (
              <div
                key={d.id ?? i}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => onSelect?.(d)}
              >
                <div style={{ width: 22, textAlign: 'center', fontSize: 12, fontWeight: isTop3 ? 700 : 500, color: isTop3 ? '#c9a227' : '#666', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ width: 58, fontSize: 13, color: '#ccc', flexShrink: 0, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortName(d.nickname, 5)}
                </div>
                <div style={{ flex: 1, height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, position: 'relative',
                    background: isTop3
                      ? 'linear-gradient(90deg,#b08010,#f0c030,#fff07a)'
                      : 'linear-gradient(90deg,#a07010,#e0b030,#f5d060)',
                    width: `${width}%`,
                    transition: `width 1s cubic-bezier(0.4,0,0.2,1) ${i * 60}ms`,
                  }}>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: 'rgba(255,255,255,0.45)', borderRadius: '0 4px 4px 0' }} />
                  </div>
                </div>
                <div style={{ width: 70, fontSize: 12, color: '#c9a227', textAlign: 'right', fontWeight: 500, flexShrink: 0 }}>
                  {fmt(d.points)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 카드뷰 ── */}
      {view === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {data.map((d, i) => {
            const numColor = i === 0 ? '#f5d060' : i === 1 ? '#b0c4de' : i === 2 ? '#cd7f32' : '#555'
            const avatarStyle = i === 0
              ? { background: 'linear-gradient(135deg,#d4a017,#fff07a)', boxShadow: '0 0 10px rgba(245,208,96,0.4)' }
              : i === 1
                ? { background: 'linear-gradient(135deg,#7090b0,#b0c4de)' }
                : i === 2
                  ? { background: 'linear-gradient(135deg,#a0622a,#cd7f32)' }
                  : { background: AVATAR_BG[i] }
            const miniWidth = animated ? barPct(d.points) : 0
            return (
              <div
                key={d.id ?? i}
                style={{
                  background: 'rgba(35,35,58,0.85)', borderRadius: 10, padding: '12px 8px 10px',
                  textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
                  position: 'relative', cursor: 'pointer',
                  opacity: animated ? 1 : 0,
                  transform: animated ? 'translateY(0)' : 'translateY(12px)',
                  transition: `opacity 0.4s ${i * 55}ms, transform 0.4s ${i * 55}ms, border-color 0.15s`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a227'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}
                onClick={() => onSelect?.(d)}
              >
                {i === 0 && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 16 }}>👑</div>
                )}
                <div style={{ fontSize: 11, fontWeight: 700, color: numColor, marginBottom: 6 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: '#1a1a2a', ...avatarStyle,
                }}>
                  {initial(d.nickname)}
                </div>
                <div style={{ fontSize: 12, color: '#ccc', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shortName(d.nickname, 5)}
                </div>
                <div style={{ fontSize: 11, color: '#c9a227', fontWeight: 500 }}>{fmt(d.points)}</div>
                <div style={{ marginTop: 7, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#a07010,#f5d060)', width: `${miniWidth}%`, transition: `width 1.2s cubic-bezier(0.4,0,0.2,1) ${i * 55}ms` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 포디엄 ── */}
      {view === 'podium' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map((d, i) => {
            const rankLabels = ['①', '②', '③']
            const rl = i < 3 ? rankLabels[i] : i + 1
            const rankColor = i === 0 ? '#f5d060' : i === 1 ? '#b0c4de' : i === 2 ? '#cd7f32' : '#555'
            const rankFontSize = i === 0 ? 16 : i < 3 ? 14 : 12
            const barColor = i === 0
              ? 'linear-gradient(90deg,#b08010,#fff07a)'
              : i === 1
                ? 'linear-gradient(90deg,#5070a0,#b0c4de)'
                : i === 2
                  ? 'linear-gradient(90deg,#804020,#cd7f32)'
                  : 'linear-gradient(90deg,#2a4a6a,#4a8ab0)'
            const barWidth = animated ? barPct(d.points) : 0
            return (
              <div
                key={d.id ?? i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0, cursor: 'pointer',
                  opacity: animated ? 1 : 0,
                  transform: animated ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `opacity 0.35s ${i * 70}ms, transform 0.35s ${i * 70}ms`,
                }}
                onClick={() => onSelect?.(d)}
              >
                <div style={{ width: 28, fontSize: rankFontSize, fontWeight: 700, textAlign: 'center', flexShrink: 0, color: rankColor }}>
                  {rl}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginRight: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, color: '#1a1a2a', background: AVATAR_BG[i],
                }}>
                  {initial(d.nickname)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#ddd', marginBottom: 3 }}>{shortName(d.nickname, 8)}</div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${barWidth}%`, background: barColor, transition: `width 1s cubic-bezier(0.4,0,0.2,1) ${i * 70}ms` }} />
                  </div>
                </div>
                <div style={{ width: 72, textAlign: 'right', fontSize: 12, color: '#c9a227', fontWeight: 500, flexShrink: 0, marginLeft: 10 }}>
                  {fmt(d.points)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── 범례 ────────────────────────────────────────────────────────────────────
function Legend({ items }) {
  return (
    <div className="flex gap-3 flex-wrap justify-end mb-3">
      {items.map(({ label, color }) => (
        <div key={label} className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── 유저 상세 모달 ──────────────────────────────────────────────────────────
function UserDetailModal({ userId, rankData, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/bets/rankings/${userId}`)
      .then(r => { setDetail(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId])

  const medal = MEDAL[rankData?.rank]
  const wr    = rankData ? winRate(rankData.won, rankData.lost) : '-'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0c0e1a', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black"
                style={{ background: 'rgba(200,168,75,0.15)', border: '1px solid rgba(200,168,75,0.3)' }}
              >
                {medal || `#${rankData?.rank}`}
              </div>
              <div>
                <div className="font-bebas text-xl text-white tracking-wide">{rankData?.nickname}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-wc-gold">{pts(rankData?.points)}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>승률 {wr}</span>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: (rankData?.net_profit ?? 0) >= 0 ? '#4ade80' : '#f87171' }}
                  >
                    {signedPts(rankData?.net_profit)}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-xl leading-none mt-1">✕</button>
          </div>

          {/* 요약 통계 */}
          {detail && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: '총 베팅',  value: `${detail.summary.won + detail.summary.lost + detail.summary.pending}회`, sub: pts(detail.summary.total_bet) },
                { label: '적중',     value: `${detail.summary.won}회`,     color: '#4ade80' },
                { label: '미적중',   value: `${detail.summary.lost}회`,    color: '#f87171' },
                { label: '대기',     value: `${detail.summary.pending}회`, color: '#94a3b8' },
                { label: '총 수령',  value: pts(detail.summary.total_payout), color: '#C8A84B' },
                { label: '순이익',   value: signedPts(detail.summary.net_profit), color: detail.summary.net_profit >= 0 ? '#4ade80' : '#f87171' },
              ].map(({ label, value, sub, color }) => (
                <div
                  key={label}
                  className="rounded-lg p-2.5 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color || 'rgba(255,255,255,0.85)' }}>{value}</div>
                  {sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{sub}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 베팅 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            베팅 내역 {detail ? `(${detail.bets.length}건)` : ''}
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-wc-gold border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && detail?.bets.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
              베팅 내역이 없습니다
            </div>
          )}

          {!loading && detail?.bets.map((bet, i) => {
            const ss = STATUS_STYLE[bet.bet_status] || STATUS_STYLE.pending
            const isPredHome = bet.prediction === 'home'
            const isPredAway = bet.prediction === 'away'
            const isPredDraw = bet.prediction === 'draw'
            const isFinished = bet.match_status === 'finished'
            const dateStr = new Date(bet.match_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            return (
              <div
                key={i}
                className="rounded-xl mb-2 p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{dateStr}</span>
                    {bet.group_name && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>
                        Group {bet.group_name}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}
                  >{ss.label}</span>
                </div>

                {/* 경기 */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`flex items-center gap-1 flex-1 justify-end ${isPredHome ? 'opacity-100' : 'opacity-50'}`}>
                    <span className="text-xs font-semibold" style={{ color: isPredHome ? '#fff' : 'rgba(255,255,255,0.55)' }}>{bet.home_team}</span>
                    <span style={{ fontSize: 18 }}>{bet.home_flag}</span>
                  </div>
                  <div className="text-center px-2">
                    {isFinished ? (
                      <span className="text-sm font-bold text-white">{bet.home_score} : {bet.away_score}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>vs</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 flex-1 ${isPredAway ? 'opacity-100' : 'opacity-50'}`}>
                    <span style={{ fontSize: 18 }}>{bet.away_flag}</span>
                    <span className="text-xs font-semibold" style={{ color: isPredAway ? '#fff' : 'rgba(255,255,255,0.55)' }}>{bet.away_team}</span>
                  </div>
                </div>

                {/* 베팅 정보 */}
                <div className="flex items-center justify-between text-xs">
                  <span
                    className="px-2 py-0.5 rounded"
                    style={{ background: 'rgba(200,168,75,0.1)', border: '1px solid rgba(200,168,75,0.2)', color: '#C8A84B' }}
                  >{PRED_KO[bet.prediction]}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{bet.amount.toLocaleString()}P 베팅</span>
                    {bet.bet_status === 'won' && bet.payout != null && (
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>+{bet.payout.toLocaleString()}P 수령</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function RankingsPage() {
  const [rankings, setRankings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [sortKey, setSortKey]       = useState('points')
  const [sortDir, setSortDir]       = useState(-1)  // -1 = desc
  const [showAll, setShowAll]       = useState(false)
  const [selected, setSelected]     = useState(null) // { id, rank, nickname, ... }

  useEffect(() => {
    api.get('/bets/rankings')
      .then(r => { setRankings(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // 정렬
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(-1) }
  }

  const sorted = [...rankings].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
    return sortDir * (bv - av)
  })

  const tableRows = showAll ? sorted : sorted.slice(0, 20)
  const top10 = rankings.slice(0, 10)

  // 요약 통계
  const totalUsers = rankings.length
  const top1Pts    = rankings[0]?.points ?? 0
  const avgPts     = totalUsers > 0 ? Math.round(rankings.reduce((s, u) => s + u.points, 0) / totalUsers) : 0
  const totalBets  = rankings.reduce((s, u) => s + u.bet_count, 0)

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* ── 헤더 ── */}
        <div className="text-center mb-8">
          <h1 className="font-bebas font-black text-4xl md:text-5xl text-wc-gold tracking-widest mb-1">
            포인트 순위
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            전체 회원 포인트 현황 · 클릭하면 베팅 내역을 볼 수 있습니다
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-wc-gold border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* ── 요약 카드 ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '총 참가자',   value: `${totalUsers.toLocaleString()}명`,     icon: '👥' },
                { label: '1위 포인트',  value: pts(top1Pts),                           icon: '🥇' },
                { label: '평균 포인트', value: pts(avgPts),                            icon: '📊' },
                { label: '총 베팅 수',  value: `${totalBets.toLocaleString()}건`,       icon: '🎯' },
              ].map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="wc-card p-4 text-center"
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
                  <div className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
                  <div className="font-bold text-sm text-wc-gold">{value}</div>
                </div>
              ))}
            </div>

            {/* ── TOP 10 멀티뷰 차트 ── */}
            <div className="wc-card p-5 mb-4">
              <Top10Chart data={top10} onSelect={setSelected} />
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* 승/패 현황 */}
              <div className="wc-card p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-white">⚔️ 적중 / 미적중 현황</div>
                </div>
                <Legend items={[
                  { label: '적중',   color: '#4ade80' },
                  { label: '미적중', color: '#f87171' },
                  { label: '대기',   color: '#475569' },
                ]} />
                <StackedBarChart data={top10} />
              </div>

              {/* 순이익 */}
              <div className="wc-card p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-white">💰 순이익 현황</div>
                </div>
                <Legend items={[
                  { label: '이익', color: 'rgba(74,222,128,0.65)' },
                  { label: '손실', color: 'rgba(248,113,113,0.65)' },
                ]} />
                <SignedBarChart data={top10} />
              </div>
            </div>

            {/* ── 전체 순위표 ── */}
            <div className="wc-card overflow-hidden">
              {/* 헤더 */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="text-sm font-semibold text-white">📋 전체 순위표</div>
                {/* 정렬 버튼 */}
                <div className="flex gap-1.5">
                  {SORT_COLS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      className="text-xs px-2 py-1 rounded-lg transition-all"
                      style={
                        sortKey === key
                          ? { background: 'rgba(200,168,75,0.2)', border: '1px solid rgba(200,168,75,0.45)', color: '#C8A84B' }
                          : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
                      }
                    >
                      {label} {sortKey === key ? (sortDir < 0 ? '↓' : '↑') : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 컬럼 헤더 */}
              <div
                className="hidden md:grid px-4 py-2 text-xs"
                style={{
                  gridTemplateColumns: '48px 1fr 100px 56px 56px 56px 60px 90px',
                  color: 'rgba(255,255,255,0.3)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div>순위</div><div>닉네임</div><div className="text-right">포인트</div>
                <div className="text-center">베팅</div><div className="text-center" style={{ color: '#4ade80' }}>적중</div>
                <div className="text-center" style={{ color: '#f87171' }}>미적중</div>
                <div className="text-center">승률</div>
                <div className="text-right">순이익</div>
              </div>

              {/* 행 */}
              {tableRows.map((u) => {
                const medal    = MEDAL[u.rank]
                const wr       = winRate(u.won, u.lost)
                const profit   = u.net_profit ?? 0
                const isTop3   = u.rank <= 3
                return (
                  <button
                    key={u.id}
                    className="w-full text-left transition-all hover:brightness-110"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isTop3 ? 'rgba(200,168,75,0.04)' : 'transparent',
                    }}
                    onClick={() => setSelected(u)}
                  >
                    {/* 데스크톱 행 */}
                    <div
                      className="hidden md:grid px-4 py-3 items-center text-sm"
                      style={{ gridTemplateColumns: '48px 1fr 100px 56px 56px 56px 60px 90px' }}
                    >
                      <div className="font-bold" style={{ color: isTop3 ? '#C8A84B' : 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                        {medal || `#${u.rank}`}
                      </div>
                      <div className="font-semibold text-white truncate">{u.nickname}</div>
                      <div className="text-right font-bold text-wc-gold">{u.points.toLocaleString()}P</div>
                      <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{u.bet_count}</div>
                      <div className="text-center text-xs font-semibold" style={{ color: '#4ade80' }}>{u.won}</div>
                      <div className="text-center text-xs font-semibold" style={{ color: '#f87171' }}>{u.lost}</div>
                      <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{wr}</div>
                      <div
                        className="text-right text-xs font-bold"
                        style={{ color: profit >= 0 ? '#4ade80' : '#f87171' }}
                      >{signedPts(profit)}</div>
                    </div>

                    {/* 모바일 행 */}
                    <div className="md:hidden px-4 py-2.5 flex items-center gap-3">
                      <div className="text-sm font-bold flex-shrink-0 w-8 text-center" style={{ color: isTop3 ? '#C8A84B' : 'rgba(255,255,255,0.4)' }}>
                        {medal || `#${u.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{u.nickname}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          베팅 {u.bet_count}회 · 적중 {u.won} · 승률 {wr}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-wc-gold">{u.points.toLocaleString()}P</div>
                        <div className="text-xs font-semibold" style={{ color: profit >= 0 ? '#4ade80' : '#f87171' }}>
                          {signedPts(profit)}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}

              {/* 더 보기 */}
              {!showAll && sorted.length > 20 && (
                <div className="px-4 py-3 text-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-sm px-6 py-2 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    전체 {sorted.length}명 보기 ↓
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 유저 상세 모달 */}
      {selected && (
        <UserDetailModal
          userId={selected.id}
          rankData={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
