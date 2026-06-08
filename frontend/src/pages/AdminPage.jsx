import { useState, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import useStore from '../store/useStore'
import { getFlagUrl, withCountry } from '../utils/flags'

function ConfirmModal({ message, subMessage, confirmLabel = '확인', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative rounded-2xl p-6 w-full max-w-sm"
        style={{
          background: 'rgba(12, 18, 32, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <p className="text-white text-base font-semibold text-center mb-1">{message}</p>
        {subMessage && <p className="text-gray-400 text-sm text-center mb-5">{subMessage}</p>}
        {!subMessage && <div className="mb-5" />}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-gray-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: 'rgba(200,168,75,0.25)', border: '1px solid rgba(200,168,75,0.5)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function FlagImg({ name, emoji, size = 28 }) {
  const [failed, setFailed] = useState(false)
  const url = getFlagUrl(name)
  if (!url || failed) return <span style={{ fontSize: size * 0.75 }}>{emoji}</span>
  return (
    <img src={url} alt={name} width={size}
      className="rounded-sm object-cover flex-shrink-0"
      style={{ height: Math.round(size * 0.67) }}
      onError={() => setFailed(true)} />
  )
}

function formatKST(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ label, value, color }) {
  return (
    <div className="wc-card p-5 text-center">
      <div className={`font-bebas text-4xl ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function MatchResultRow({ match, onUpdated, pendingBetCount }) {
  const [homeScore, setHomeScore] = useState(match.home_score ?? '')
  const [awayScore, setAwayScore] = useState(match.away_score ?? '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirm, setConfirm] = useState(null) // { message, subMessage, confirmLabel, onConfirm }

  const handleSubmit = async () => {
    if (homeScore === '' || awayScore === '') { setMsg('점수를 입력하세요'); return }
    setLoading(true)
    setMsg('')
    try {
      await api.put(`/admin/matches/${match.id}/result`, {
        home_score: Number(homeScore),
        away_score: Number(awayScore),
      })
      setMsg('✅ 저장됨')
      onUpdated()
    } catch (err) {
      setMsg(err.response?.data?.detail || '오류')
    } finally {
      setLoading(false)
    }
  }

  const handleStatus = async (newStatus) => {
    setLoading(true)
    try {
      await api.put(`/admin/matches/${match.id}/status`, newStatus, {
        headers: { 'Content-Type': 'application/json' },
      })
      setMsg('✅ 상태 변경됨')
      onUpdated()
    } catch (err) {
      setMsg(err.response?.data?.detail || '오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Fragment>
    {confirm && (
      <ConfirmModal
        message={confirm.message}
        subMessage={confirm.subMessage}
        confirmLabel={confirm.confirmLabel}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    )}
    <div className={`wc-card p-4 ${match.is_korea_match ? 'border-wc-gold/40' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* 경기 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {match.is_korea_match && <span className="text-xs text-wc-gold font-bold">🇰🇷</span>}
            <span className="text-sm font-bold text-white">
              {match.home_flag} {match.home_team} vs {match.away_flag} {match.away_team}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              match.status === 'finished' ? 'bg-green-800 text-green-300' :
              match.status === 'ongoing' ? 'bg-red-600 text-white' :
              'bg-gray-700 text-gray-300'
            }`}>
              {match.status === 'finished' ? '종료' : match.status === 'ongoing' ? 'LIVE' : '예정'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {formatKST(match.match_date)} · {match.city} · Group {match.group_name}
          </div>
        </div>

        {/* 점수 입력 */}
        {match.status !== 'finished' && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              min={0}
              max={20}
              placeholder="홈"
              className="glass-input w-14 px-2 py-1 text-center text-sm"
            />
            <span className="text-gray-500">:</span>
            <input
              type="number"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              min={0}
              max={20}
              placeholder="원정"
              className="glass-input w-14 px-2 py-1 text-center text-sm"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-gold text-xs py-1.5 px-3"
            >
              결과 저장
            </button>
          </div>
        )}

        {match.status === 'finished' && (
          <div className="flex items-center gap-3">
            <div className="font-bebas text-xl text-wc-gold">
              {match.home_score} : {match.away_score}
            </div>
            <button
              onClick={() => setConfirm({
                message: '결과를 초기화하시겠습니까?',
                subMessage: match.is_korea_match ? '베팅 정산도 함께 취소됩니다.' : null,
                confirmLabel: '초기화',
                onConfirm: async () => {
                  setConfirm(null)
                  setLoading(true)
                  setMsg('')
                  try {
                    await api.delete(`/admin/matches/${match.id}/result`)
                    setMsg('✅ 초기화 완료')
                    onUpdated()
                  } catch (err) {
                    setMsg(err.response?.data?.detail || '오류')
                  } finally {
                    setLoading(false)
                  }
                },
              })}
              disabled={loading}
              className="text-xs bg-gray-700 hover:bg-red-800 text-gray-300 hover:text-white py-1.5 px-3 rounded transition-colors"
            >
              결과 초기화
            </button>
          </div>
        )}

        {/* 상태 변경 버튼 */}
        {match.status === 'upcoming' && (
          <button
            onClick={() => handleStatus('ongoing')}
            disabled={loading}
            className="text-xs bg-red-600 hover:bg-red-500 text-white py-1.5 px-3 rounded transition-colors"
          >
            ▶ LIVE 시작
          </button>
        )}

        {/* 베팅 초기화 버튼 - 미종료 & 베팅 있음 */}
        {match.status !== 'finished' && pendingBetCount > 0 && (
          <button
            onClick={() => setConfirm({
              message: '베팅을 초기화하시겠습니까?',
              subMessage: '모든 베팅이 취소되고 포인트가 환불됩니다.',
              confirmLabel: '초기화',
              onConfirm: async () => {
                setConfirm(null)
                setLoading(true)
                setMsg('')
                try {
                  const res = await api.delete(`/admin/matches/${match.id}/bets`)
                  setMsg(`✅ ${res.data.message}`)
                  onUpdated()
                } catch (err) {
                  setMsg(err.response?.data?.detail || '오류')
                } finally {
                  setLoading(false)
                }
              },
            })}
            disabled={loading}
            className="text-xs bg-gray-700 hover:bg-yellow-800 text-gray-300 hover:text-yellow-200 py-1.5 px-3 rounded transition-colors"
          >
            베팅 초기화
          </button>
        )}
      </div>

      {msg && (
        <div className={`mt-2 text-xs ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
          {msg}
        </div>
      )}
    </div>
    </Fragment>
  )
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

const STAGE_KO = {
  group:        { label: '조별예선', color: 'text-blue-400',   bg: 'bg-blue-900/40'   },
  round_of_32:  { label: '32강',    color: 'text-purple-400', bg: 'bg-purple-900/40' },
  round_of_16:  { label: '16강',    color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
  quarterfinal: { label: '8강',     color: 'text-orange-400', bg: 'bg-orange-900/40' },
  semifinal:    { label: '4강',     color: 'text-red-400',    bg: 'bg-red-900/40'    },
  third_place:  { label: '3·4위',   color: 'text-gray-400',   bg: 'bg-gray-800/60'   },
  final:        { label: '결승',    color: 'text-wc-gold',    bg: 'bg-yellow-900/40' },
}

// ── 시합 일정 달력 탭 ─────────────────────────────────────────────────────
function ScheduleCalendarTab({ matches, onMatchesUpdated }) {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(5) // 0-indexed: 5=6월
  const [selectedDate, setSelectedDate] = useState(null)
  const [finishConfirm, setFinishConfirm] = useState(false)
  const [finishLoading, setFinishLoading] = useState(false)
  const [finishMsg, setFinishMsg] = useState('')

  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const DAY_NAMES   = ['일','월','화','수','목','금','토']

  // match_date(UTC) → KST 날짜 키 'YYYY-MM-DD'
  const toKSTKey = (dateStr) => {
    const d = new Date(dateStr)
    const kst = new Date(d.getTime() + 9 * 3600 * 1000)
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth()+1).padStart(2,'0')}-${String(kst.getUTCDate()).padStart(2,'0')}`
  }

  const matchesByDate = {}
  matches.forEach(m => {
    const key = toKSTKey(m.match_date)
    if (!matchesByDate[key]) matchesByDate[key] = []
    matchesByDate[key].push(m)
  })

  const firstDow   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstDow).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1); setSelectedDate(null) }
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1); setSelectedDate(null) }

  const dayMatches = selectedDate ? (matchesByDate[selectedDate] || []).sort((a,b) => new Date(a.match_date) - new Date(b.match_date)) : []

  const formatKSTTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' })
  }

  // 이 달에 경기 있는 날 수
  const monthMatchDays = Object.keys(matchesByDate).filter(k => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.06)'}}>◀</button>
        <div className="text-center">
          <div className="font-bebas text-3xl text-wc-gold tracking-widest">{year}년 {MONTH_NAMES[month]}</div>
          {monthMatchDays > 0 && <div className="text-xs text-gray-500 mt-0.5">경기 있는 날 {monthMatchDays}일</div>}
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors" style={{background:'rgba(255,255,255,0.06)'}}>▶</button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div key={d} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'}`}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dow      = (firstDow + day - 1) % 7
          const dateKey  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const dayList  = matchesByDate[dateKey] || []
          const hasMatch = dayList.length > 0
          const isSelected = selectedDate === dateKey
          const hasKorea = dayList.some(m => m.is_korea_match)
          const stages   = [...new Set(dayList.map(m => m.stage))]

          return (
            <div
              key={i}
              onClick={() => hasMatch ? setSelectedDate(isSelected ? null : dateKey) : null}
              className={`relative rounded-xl p-1.5 min-h-[52px] flex flex-col items-center transition-all
                ${hasMatch ? 'cursor-pointer hover:scale-105' : 'opacity-40'}
                ${isSelected ? 'ring-2 ring-wc-gold' : ''}
              `}
              style={{
                background: isSelected
                  ? 'rgba(200,168,75,0.18)'
                  : hasMatch
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(255,255,255,0.02)',
                border: isSelected ? '1px solid rgba(200,168,75,0.5)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className={`text-sm font-bold mb-0.5 ${dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-300'}`}>{day}</span>
              {hasMatch && (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <span className="text-[10px] font-bold text-wc-gold">{dayList.length}경기</span>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {stages.slice(0,2).map(s => (
                      <span key={s} className={`text-[8px] px-1 rounded ${STAGE_KO[s]?.bg || 'bg-gray-800'} ${STAGE_KO[s]?.color || 'text-gray-400'}`}>
                        {STAGE_KO[s]?.label || s}
                      </span>
                    ))}
                  </div>
                  {hasKorea && <span className="text-[9px]">🇰🇷</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 선택한 날짜의 경기 목록 */}
      {selectedDate && (
        <div>
          {finishConfirm && (
            <ConfirmModal
              message={`${selectedDate.replace(/-/g, '.')} 경기를 임의 종료하시겠습니까?`}
              subMessage={`미종료 경기 ${dayMatches.filter(m => m.status !== 'finished').length}경기에 랜덤 점수를 부여하고 베팅을 즉시 정산합니다.`}
              confirmLabel="종료 및 정산"
              onConfirm={async () => {
                setFinishConfirm(false)
                setFinishLoading(true)
                setFinishMsg('')
                try {
                  const res = await api.post('/admin/matches/finish-by-date', { date: selectedDate })
                  const lines = res.data.results.map(r => `${r.home_team} ${r.home_score}:${r.away_score} ${r.away_team}`)
                  setFinishMsg(`✅ ${res.data.message}\n${lines.join(' / ')}`)
                  onMatchesUpdated()
                } catch (err) {
                  setFinishMsg('❌ ' + (err.response?.data?.detail || '오류'))
                } finally {
                  setFinishLoading(false)
                }
              }}
              onCancel={() => setFinishConfirm(false)}
            />
          )}

          <div className="text-sm font-bold text-wc-gold mb-3 flex items-center gap-2 flex-wrap">
            <span>📅 {selectedDate.replace(/-/g, '.')} 경기 일정</span>
            <span className="text-gray-500 font-normal">({dayMatches.length}경기)</span>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {finishMsg && (
                <span className={`text-xs font-normal whitespace-pre-line ${finishMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {finishMsg}
                </span>
              )}
              {dayMatches.some(m => m.status !== 'finished') && (
                <button
                  onClick={() => { setFinishMsg(''); setFinishConfirm(true) }}
                  disabled={finishLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(200,168,75,0.2)',
                    border: '1px solid rgba(200,168,75,0.5)',
                    color: '#C8A84B',
                  }}
                >
                  {finishLoading ? '정산 중...' : '🏁 경기 종료 (임의 결과)'}
                </button>
              )}
            </div>
          </div>
          {dayMatches.length === 0 ? (
            <div className="text-center text-gray-500 py-6 text-sm">이 날 경기가 없습니다</div>
          ) : (
            <div className="space-y-2">
              {dayMatches.map(m => {
                const stage = STAGE_KO[m.stage] || { label: m.stage, color: 'text-gray-400', bg: 'bg-gray-800' }
                return (
                  <div
                    key={m.id}
                    className="wc-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    style={m.is_korea_match ? {borderColor:'rgba(200,168,75,0.35)'} : {}}
                  >
                    {/* 시간 */}
                    <div className="flex-shrink-0 text-center w-14">
                      <div className="font-bebas text-xl text-wc-gold">{formatKSTTime(m.match_date)}</div>
                      <div className="text-[10px] text-gray-500">KST</div>
                    </div>

                    {/* 팀 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.is_korea_match && <span className="text-xs text-wc-gold font-bold">🇰🇷</span>}
                        <span className={`font-bold text-sm ${m.home_team === '미정' ? 'text-gray-400' : 'text-white'}`}>
                          {m.home_flag} {m.home_team} <span className="text-gray-500">vs</span> {m.away_flag} {m.away_team}
                        </span>
                        {m.home_score != null && (
                          <span className="font-bebas text-wc-gold text-base">{m.home_score} : {m.away_score}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.venue} · {m.city}</div>
                    </div>

                    {/* 배지들 */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stage.bg} ${stage.color}`}>
                        {stage.label}{m.group_name ? ` ${m.group_name}조` : ''}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        m.status === 'finished' ? 'bg-green-800 text-green-300' :
                        m.status === 'ongoing'  ? 'bg-red-600 text-white' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {m.status === 'finished' ? '종료' : m.status === 'ongoing' ? 'LIVE' : '예정'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 경기 베팅 현황 탭 ─────────────────────────────────────────────────────
function MatchBetsTab({ matches, pendingCounts }) {
  const [selectedId, setSelectedId] = useState('')
  const [groupTab, setGroupTab] = useState('A')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const load = async (id) => {
    if (String(id) === String(selectedId)) return
    setSelectedId(String(id)); setData(null); setPage(1)
    setLoading(true)
    try { const r = await api.get(`/admin/matches/${id}/bets`); setData(r.data) }
    finally { setLoading(false) }
  }

  const PRED_KO    = { home: '홈 승', draw: '무승부', away: '원정 승' }
  const PRED_COLOR = { home: 'text-green-400', draw: 'text-yellow-400', away: 'text-red-400' }
  const STATUS_KO  = { pending: '대기', won: '적중', lost: '미적중', refunded: '환불' }
  const STATUS_CLS = { pending: 'text-gray-400', won: 'text-green-400', lost: 'text-red-400', refunded: 'text-gray-500' }

  const groupMatches = matches.filter(m => m.group_name === groupTab)
  const filteredBets = (data?.bets || []).filter(b => !search || b.nickname.includes(search))
  const totalPages   = Math.ceil(filteredBets.length / PAGE_SIZE)
  const paginated    = filteredBets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const STATUS_BADGE = {
    upcoming: { label: '예정', cls: 'bg-gray-700/70 text-gray-300' },
    ongoing:  { label: 'LIVE', cls: 'bg-red-600 text-white' },
    finished: { label: '종료', cls: 'bg-green-800 text-green-300' },
  }

  return (
    <div>
      {/* 그룹 탭 */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {GROUPS.map(g => (
          <button key={g} onClick={() => { setGroupTab(g); setSelectedId(''); setData(null) }}
            className={`w-10 h-10 rounded-lg font-bebas text-lg font-bold transition-all ${
              groupTab === g ? 'bg-wc-gold text-black glow-box-gold' : 'text-gray-300 hover:text-wc-gold'
            }`}
            style={groupTab !== g ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } : {}}>
            {g}
          </button>
        ))}
      </div>

      {/* 경기 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {groupMatches.map(m => {
          const isSelected = String(m.id) === selectedId
          const betCnt = pendingCounts?.[m.id] || 0
          const badge  = STATUS_BADGE[m.status] || STATUS_BADGE.upcoming
          return (
            <button key={m.id} onClick={() => load(m.id)}
              className="text-left transition-all duration-200 rounded-xl p-3 hover:scale-[1.02]"
              style={{
                background: isSelected ? 'rgba(200,168,75,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? 'rgba(200,168,75,0.5)' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: isSelected ? '0 0 16px rgba(200,168,75,0.15)' : 'none',
              }}>
              {/* 상태 + 베팅 건수 */}
              <div className="flex items-center justify-between mb-2.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                <span className="text-[10px] text-gray-500">
                  {betCnt > 0 ? <span className="text-wc-gold font-bold">{betCnt}건 베팅</span> : '베팅 없음'}
                </span>
              </div>
              {/* 팀 vs 팀 */}
              <div className="flex items-center gap-2">
                <FlagImg name={m.home_team} emoji={m.home_flag} size={26} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${isSelected ? 'text-wc-gold' : 'text-white'}`}>
                    {m.home_team}
                  </div>
                </div>
                <div className="text-xs font-bold text-gray-500 px-1">
                  {m.status === 'finished' ? `${m.home_score}:${m.away_score}` : 'vs'}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className={`text-sm font-bold truncate ${isSelected ? 'text-wc-gold' : 'text-white'}`}>
                    {m.away_team}
                  </div>
                </div>
                <FlagImg name={m.away_team} emoji={m.away_flag} size={26} />
              </div>
            </button>
          )
        })}
      </div>

      {/* 베팅 상세 닉네임 검색 */}
      {data && (
        <div className="flex items-center gap-3 mb-4">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="닉네임 검색..."
            className="glass-input px-3 py-2 text-sm w-44" />
          <span className="text-xs text-gray-500">
            {filteredBets.length.toLocaleString()}건
          </span>
        </div>
      )}

      {loading && <div className="text-center text-gray-500 py-20">로딩 중...</div>}

      {data && (
        <>
          {/* 경기 헤더 */}
          <div className="wc-card p-4 mb-5">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="font-bold text-white">{data.match.home_flag} {data.match.home_team}</span>
              <span className="text-gray-500 font-bebas text-xl">
                {data.match.status === 'finished' ? `${data.match.home_score} : ${data.match.away_score}` : 'VS'}
              </span>
              <span className="font-bold text-white">{data.match.away_team} {data.match.away_flag}</span>
            </div>
            {/* 베팅 풀 바 */}
            {data.summary.total_pool > 0 && (
              <div>
                <div className="flex text-xs text-gray-400 mb-1 justify-between">
                  <span>총 {data.summary.bet_count}건 · {data.summary.total_pool.toLocaleString()}P</span>
                </div>
                <div className="flex h-5 rounded-full overflow-hidden text-[10px] font-bold">
                  {['home','draw','away'].map((k, i) => {
                    const pct = data.summary.total_pool > 0 ? (data.summary[k].total / data.summary.total_pool * 100).toFixed(1) : 0
                    const colors = ['bg-green-600','bg-yellow-500','bg-red-500']
                    return pct > 0 ? (
                      <div key={k} className={`${colors[i]} flex items-center justify-center text-white`} style={{width:`${pct}%`}}>
                        {pct}%
                      </div>
                    ) : null
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span className="text-green-400">홈 {data.summary.home.count}건 {data.summary.home.total.toLocaleString()}P</span>
                  <span className="text-yellow-400">무 {data.summary.draw.count}건 {data.summary.draw.total.toLocaleString()}P</span>
                  <span className="text-red-400">원정 {data.summary.away.count}건 {data.summary.away.total.toLocaleString()}P</span>
                </div>
              </div>
            )}
          </div>

          {/* 베팅 테이블 */}
          <div className="wc-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-500">
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">닉네임</th>
                  <th className="text-center px-3 py-2.5">예측</th>
                  <th className="text-right px-4 py-2.5">베팅액</th>
                  <th className="text-center px-3 py-2.5">상태</th>
                  <th className="text-right px-4 py-2.5">지급액</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2 text-gray-600">{(page-1)*PAGE_SIZE + i + 1}</td>
                    <td className="px-4 py-2 text-white font-medium">{withCountry(b.nickname, b.national)}</td>
                    <td className={`px-3 py-2 text-center font-bold ${PRED_COLOR[b.prediction]}`}>{PRED_KO[b.prediction]}</td>
                    <td className="px-4 py-2 text-right text-white">{b.amount.toLocaleString()}P</td>
                    <td className={`px-3 py-2 text-center font-bold ${STATUS_CLS[b.status]}`}>{STATUS_KO[b.status]}</td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {b.payout != null ? `${b.payout.toLocaleString()}P` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBets.length === 0 && (
              <div className="text-center text-gray-500 py-8 text-sm">베팅 데이터가 없습니다</div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-1 mt-4 flex-wrap">
              {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs font-bold transition-all ${p === page ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'}`}
                  style={p !== page ? {background:'rgba(255,255,255,0.05)'} : {}}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── 회원 베팅 상세 모달 ────────────────────────────────────────────────────
function UserBetModal({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/users/${userId}/bets`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [userId])

  const PRED_KO    = { home: '홈 승', draw: '무승부', away: '원정 승' }
  const PRED_COLOR = { home: 'text-green-400', draw: 'text-yellow-400', away: 'text-red-400' }
  const STATUS_KO  = { pending: '대기', won: '적중', lost: '미적중', refunded: '환불' }
  const STATUS_CLS = { pending: 'text-gray-400', won: 'text-green-400', lost: 'text-red-400', refunded: 'text-gray-500' }

  function formatKST2(iso) {
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="wc-card w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          {loading ? (
            <span className="text-gray-400 text-sm">로딩 중...</span>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <div className="font-bold text-white text-base">{data?.user && withCountry(data.user.nickname, data.user.national)}</div>
                <div className="text-gray-500 text-xs">{data?.user.email}</div>
              </div>
              {data && (
                <div className="flex gap-3 text-xs flex-wrap">
                  <span className="px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.06)'}}>
                    총 베팅 <span className="text-white font-bold ml-1">{data.bets.length}건</span>
                  </span>
                  <span className="px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.06)'}}>
                    투자 <span className="text-white font-bold ml-1">{data.summary.total_bet.toLocaleString()}P</span>
                  </span>
                  <span className="px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.06)'}}>
                    회수 <span className="text-blue-400 font-bold ml-1">{data.summary.total_payout.toLocaleString()}P</span>
                  </span>
                  <span className="px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.06)'}}>
                    손익 <span className={`font-bold ml-1 ${data.summary.net_profit > 0 ? 'text-green-400' : data.summary.net_profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {data.summary.net_profit > 0 ? '+' : ''}{data.summary.net_profit.toLocaleString()}P
                    </span>
                  </span>
                  <span className="px-2 py-1 rounded-lg" style={{background:'rgba(255,255,255,0.06)'}}>
                    현재 <span className="text-wc-gold font-bold ml-1">{data?.user.points.toLocaleString()}P</span>
                  </span>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg flex-shrink-0 ml-4">✕</button>
        </div>

        {/* 베팅 목록 */}
        <div className="overflow-y-auto flex-1">
          {loading && <div className="text-center text-gray-500 py-16">로딩 중...</div>}
          {data && data.bets.length === 0 && (
            <div className="text-center text-gray-500 py-16">베팅 내역이 없습니다</div>
          )}
          {data && data.bets.length > 0 && (
            <table className="w-full text-xs">
              <thead className="sticky top-0" style={{background:'rgba(10,14,26,0.95)'}}>
                <tr className="border-b border-white/8 text-gray-500">
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">경기</th>
                  <th className="text-left px-4 py-3">일시</th>
                  <th className="text-center px-3 py-3">예측</th>
                  <th className="text-right px-4 py-3">베팅액</th>
                  <th className="text-center px-3 py-3">결과</th>
                  <th className="text-right px-4 py-3">손익</th>
                </tr>
              </thead>
              <tbody>
                {data.bets.map((b, i) => {
                  const profit = b.bet_status === 'won'  ? (b.payout - b.amount) :
                                 b.bet_status === 'lost' ? -b.amount : null
                  return (
                    <tr key={i} className={`border-b border-white/5 transition-colors ${
                      b.bet_status === 'won'  ? 'hover:bg-green-900/10' :
                      b.bet_status === 'lost' ? 'hover:bg-red-900/10' : 'hover:bg-white/3'
                    }`}>
                      <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FlagImg name={b.home_team} emoji={b.home_flag} size={20} />
                          <span className="text-white font-medium whitespace-nowrap">{b.home_team}</span>
                          <span className="text-gray-600 text-[10px] font-bold">
                            {b.match_status === 'finished' ? `${b.home_score}:${b.away_score}` : 'vs'}
                          </span>
                          <span className="text-white font-medium whitespace-nowrap">{b.away_team}</span>
                          <FlagImg name={b.away_team} emoji={b.away_flag} size={20} />
                        </div>
                        <div className="text-gray-600 text-[10px] mt-0.5">Group {b.group_name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatKST2(b.match_date)}</td>
                      <td className={`px-3 py-3 text-center font-bold ${PRED_COLOR[b.prediction]}`}>
                        {PRED_KO[b.prediction]}
                      </td>
                      <td className="px-4 py-3 text-right text-white">{b.amount.toLocaleString()}P</td>
                      <td className={`px-3 py-3 text-center font-bold ${STATUS_CLS[b.bet_status]}`}>
                        {STATUS_KO[b.bet_status]}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {profit != null
                          ? `${profit > 0 ? '+' : ''}${profit.toLocaleString()}P`
                          : <span className="text-gray-600">대기 중</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 포인트 통계 탭 ────────────────────────────────────────────────────────
function PointStatsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats/points')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-gray-500 py-20">로딩 중...</div>
  if (!data) return null

  const P = (n) => Number(n).toLocaleString()
  const wan = (n) => (n / 10000).toFixed(1) + '만P'

  // 포인트 흐름 바 (현재보유 + 대기베팅 + 수수료 = 초기)
  const barTotal = data.initial_total || 1
  const pctCurrent  = (data.current_total  / barTotal * 100).toFixed(1)
  const pctPending  = (data.pending_amount / barTotal * 100).toFixed(1)
  const pctFee      = (data.fee_collected  / barTotal * 100).toFixed(1)
  const pctRest     = Math.max(0, 100 - Number(pctCurrent) - Number(pctPending) - Number(pctFee)).toFixed(1)

  return (
    <div className="space-y-6">

      {/* 핵심 지표 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 초기 지급 총합 */}
        <div className="wc-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">초기 지급 포인트 총합</div>
          <div className="font-bebas text-3xl text-blue-400">{wan(data.initial_total)}</div>
          <div className="text-xs text-gray-600 mt-1">{data.member_count.toLocaleString()}명 × 100,000P</div>
        </div>
        {/* 현재 보유 포인트 합계 */}
        <div className="wc-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">현재 회원 보유 포인트 합계</div>
          <div className="font-bebas text-3xl text-wc-gold">{wan(data.current_total)}</div>
          <div className="text-xs mt-1">
            <span className={data.point_diff > 0 ? 'text-red-400' : 'text-green-400'}>
              {data.point_diff > 0 ? '▼ ' : '▲ '}{wan(Math.abs(data.point_diff))}
            </span>
            <span className="text-gray-600 ml-1">초기 대비</span>
          </div>
        </div>
        {/* 수수료 소각 포인트 */}
        <div className="wc-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">수수료로 소각된 포인트</div>
          <div className="font-bebas text-3xl text-red-400">{wan(data.fee_collected)}</div>
          <div className="text-xs text-gray-600 mt-1">정산 완료 풀의 5%</div>
        </div>
      </div>

      {/* 포인트 흐름 바 */}
      <div className="wc-card p-5">
        <div className="text-sm font-bold text-white mb-3">포인트 흐름</div>
        <div className="flex h-7 rounded-full overflow-hidden text-[11px] font-bold mb-2">
          {Number(pctCurrent) > 0 && (
            <div className="bg-wc-gold/80 flex items-center justify-center text-black transition-all" style={{width:`${pctCurrent}%`}}>
              {pctCurrent}%
            </div>
          )}
          {Number(pctPending) > 0 && (
            <div className="bg-blue-500/80 flex items-center justify-center text-white transition-all" style={{width:`${pctPending}%`}}>
              {pctPending}%
            </div>
          )}
          {Number(pctFee) > 0 && (
            <div className="bg-red-500/70 flex items-center justify-center text-white transition-all" style={{width:`${pctFee}%`}}>
              {pctFee}%
            </div>
          )}
          {Number(pctRest) > 0 && (
            <div className="bg-gray-700/50 flex items-center justify-center text-gray-400 transition-all" style={{width:`${pctRest}%`}}>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-xs mt-1">
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-wc-gold/80 mr-1 align-middle" />현재 보유 {P(data.current_total)}P</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500/80 mr-1 align-middle" />베팅 대기 {P(data.pending_amount)}P</span>
          <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500/70 mr-1 align-middle" />수수료 소각 {P(data.fee_collected)}P</span>
        </div>
      </div>

      {/* 베팅 상세 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="wc-card p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">누적 총 베팅액</div>
          <div className="font-bebas text-2xl text-white">{wan(data.total_bet)}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">환불 제외</div>
        </div>
        <div className="wc-card p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">베팅 대기 포인트</div>
          <div className="font-bebas text-2xl text-blue-400">{wan(data.pending_amount)}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{P(data.pending_count)}건</div>
        </div>
        <div className="wc-card p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">승리 지급액</div>
          <div className="font-bebas text-2xl text-green-400">{wan(data.won_payout)}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{P(data.won_count)}건 적중</div>
        </div>
        <div className="wc-card p-4 text-center">
          <div className="text-[10px] text-gray-500 mb-1">패배 소멸 포인트</div>
          <div className="font-bebas text-2xl text-red-400">{wan(data.lost_amount)}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{P(data.lost_count)}건 미적중</div>
        </div>
      </div>

      {/* 회원 보유 포인트 분포 */}
      <div className="wc-card p-5">
        <div className="text-sm font-bold text-white mb-4">회원 보유 포인트 분포</div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10px] text-gray-500 mb-1">최고 보유</div>
            <div className="font-bebas text-2xl text-green-400">{P(data.max_points)}P</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">평균 보유</div>
            <div className="font-bebas text-2xl text-wc-gold">{P(data.avg_points)}P</div>
            <div className="text-[10px] text-gray-600 mt-0.5">
              초기 대비 {((data.avg_points / 100000) * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 mb-1">최저 보유</div>
            <div className="font-bebas text-2xl text-red-400">{P(data.min_points)}P</div>
          </div>
        </div>

        {/* 평균 대비 바 */}
        <div className="mt-5">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            <span>{P(data.min_points)}P</span>
            <span className="text-wc-gold">평균 {P(data.avg_points)}P</span>
            <span>{P(data.max_points)}P</span>
          </div>
          <div className="relative h-3 rounded-full" style={{background:'rgba(255,255,255,0.06)'}}>
            {/* 평균 마커 */}
            <div
              className="absolute top-0 h-3 rounded-full bg-gradient-to-r from-red-500/60 via-wc-gold/60 to-green-500/60"
              style={{
                left: 0,
                width: `${((data.avg_points - data.min_points) / Math.max(data.max_points - data.min_points, 1)) * 100}%`
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-wc-gold ring-2 ring-wc-gold/50"
              style={{
                left: `calc(${((data.avg_points - data.min_points) / Math.max(data.max_points - data.min_points, 1)) * 100}% - 4px)`
              }}
            />
          </div>
        </div>
      </div>

    </div>
  )
}


// ── 회원 손익 탭 ───────────────────────────────────────────────────────────
function SimulatorSettingsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/admin/simulator-settings')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading || !data) {
    return <div className="text-center text-gray-500 py-20">로딩 중...</div>
  }

  const update = (patch) => setData(prev => ({ ...prev, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await api.put('/admin/simulator-settings', {
        signup_enabled: data.signup_enabled,
        signup_interval_sec: Number(data.signup_interval_sec),
        board_enabled: data.board_enabled,
        board_interval_sec: Number(data.board_interval_sec),
      })
      setData(res.data)
      setMsg('완료: 설정이 저장되었습니다')
    } catch (err) {
      setMsg(err.response?.data?.detail || '저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const Card = ({ title, desc, enabledKey, intervalKey, intervalLabel }) => (
    <div className="wc-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-white">{title}</div>
          <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
        </div>
        <button
          onClick={() => update({ [enabledKey]: !data[enabledKey] })}
          className="relative w-14 h-7 rounded-full transition-colors flex-shrink-0"
          style={{ background: data[enabledKey] ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.1)' }}
        >
          <span
            className="absolute top-0.5 w-6 h-6 rounded-full transition-all"
            style={{
              left: data[enabledKey] ? '30px' : '2px',
              background: data[enabledKey] ? '#4ade80' : 'rgba(255,255,255,0.5)',
            }}
          />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 whitespace-nowrap">{intervalLabel}</span>
        <input
          type="number"
          min={5}
          max={3600}
          value={data[intervalKey]}
          onChange={e => update({ [intervalKey]: e.target.value })}
          disabled={!data[enabledKey]}
          className="glass-input w-28 px-3 py-1.5 text-sm disabled:opacity-40"
        />
        <span className="text-xs text-gray-500">초 (5~3600)</span>
      </div>
      <div className="text-xs">
        상태: <span className={data[enabledKey] ? 'text-green-400 font-bold' : 'text-gray-500'}>
          {data[enabledKey] ? '🟢 활성' : '⚪ 비활성'}
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          title="🤖 회원가입 시뮬레이터"
          desc="가상 회원이 자동으로 가입하고 베팅합니다"
          enabledKey="signup_enabled"
          intervalKey="signup_interval_sec"
          intervalLabel="가입 주기"
        />
        <Card
          title="📣 게시판 자동생성 시뮬레이터"
          desc="가상 회원이 응원글·댓글·반응을 자동 생성합니다"
          enabledKey="board_enabled"
          intervalKey="board_interval_sec"
          intervalLabel="작성 주기"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {saving ? '저장 중...' : '설정 저장'}
        </button>
        {msg && (
          <span className={`text-xs ${msg.startsWith('완료') ? 'text-green-400' : 'text-red-400'}`}>{msg}</span>
        )}
        {data.updated_at && (
          <span className="text-xs text-gray-600 ml-auto">최근 수정: {formatKST(data.updated_at)}</span>
        )}
      </div>

      <div className="text-xs text-gray-500 wc-card p-4 leading-relaxed">
        ⚠️ 이 설정은 시뮬레이터 프로그램(<code className="text-gray-400">simulator.py</code> · <code className="text-gray-400">board_simulator.py</code>)이
        실행 중일 때만 적용됩니다. 활성화 후 해당 프로그램을 실행해야 자동 활동이 시작됩니다.
      </div>
    </div>
  )
}

function UserProfitTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const PAGE_SIZE = 30

  useEffect(() => {
    api.get('/admin/users/bet-summary')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = (data || []).filter(u =>
    !search || u.nickname.includes(search) || u.email.includes(search)
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  if (loading) return <div className="text-center text-gray-500 py-20">로딩 중...</div>

  const totalProfit = (data || []).reduce((s, u) => s + u.net_profit, 0)

  return (
    <div>
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="닉네임/이메일 검색..."
          className="glass-input px-3 py-2 text-sm w-52"
        />
        <span className="text-xs text-gray-500 ml-auto">
          총 {filtered.length.toLocaleString()}명 · 전체 손익 합계:{' '}
          <span className={totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()}P
          </span>
        </span>
      </div>

      <div className="wc-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 text-gray-500">
              <th className="text-left px-4 py-2.5">순위</th>
              <th className="text-left px-4 py-2.5">닉네임</th>
              <th className="text-center px-3 py-2.5">베팅수</th>
              <th className="text-center px-3 py-2.5">적중/미적중</th>
              <th className="text-right px-4 py-2.5">총베팅액</th>
              <th className="text-right px-4 py-2.5">총지급액</th>
              <th className="text-right px-4 py-2.5 font-bold text-white">손익</th>
              <th className="text-right px-4 py-2.5">현재 포인트</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((u, i) => {
              const rank = (page-1)*PAGE_SIZE + i + 1
              const profit = u.net_profit
              return (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-2 text-gray-500 font-bold">{rank}</td>
                  <td className="px-4 py-2">
                    <div className="text-white font-medium">{withCountry(u.nickname, u.national)}</div>
                    <div className="text-gray-600 text-[10px]">{u.email}</div>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300">{u.bet_count}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-green-400">{u.won}승</span>
                    <span className="text-gray-600 mx-1">/</span>
                    <span className="text-red-400">{u.lost}패</span>
                    {u.pending > 0 && <span className="text-gray-500 ml-1">({u.pending}대기)</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-300">{u.total_bet.toLocaleString()}P</td>
                  <td className="px-4 py-2 text-right text-blue-400">{u.total_payout.toLocaleString()}P</td>
                  <td className={`px-4 py-2 text-right font-bold ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                    {profit > 0 ? '+' : ''}{profit.toLocaleString()}P
                  </td>
                  <td className="px-4 py-2 text-right text-wc-gold">{u.points.toLocaleString()}P</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setSelectedUserId(u.id)}
                      className="text-[10px] font-bold px-2 py-1 rounded transition-colors hover:text-white whitespace-nowrap"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4 flex-wrap">
          {Array.from({length: Math.min(totalPages, 20)}, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-xs font-bold transition-all ${p === page ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'}`}
              style={p !== page ? {background:'rgba(255,255,255,0.05)'} : {}}>
              {p}
            </button>
          ))}
        </div>
      )}

      {selectedUserId && (
        <UserBetModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [matches, setMatches] = useState([])
  const [pendingCounts, setPendingCounts] = useState({})
  const [filter, setFilter] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('matches')
  const [resetAllConfirm, setResetAllConfirm] = useState(false)
  const [resetAllLoading, setResetAllLoading] = useState(false)
  const [resetAllMsg, setResetAllMsg] = useState('')
  const [simConfirm, setSimConfirm] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const [simMsg, setSimMsg] = useState('')

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    if (!user.is_admin) { navigate('/'); return }
    fetchAll()
  }, [user])

  const fetchAll = async () => {
    try {
      const [statsRes, matchRes, countsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/matches'),
        api.get('/admin/bets/pending-counts'),
      ])
      setStats(statsRes.data)
      setMatches(matchRes.data)
      setPendingCounts(countsRes.data)
    } finally {
      setLoading(false)
    }
  }

  const filtered = matches.filter((m) => filter === 'all' || m.status === filter)

  if (!user?.is_admin) return null

  const TABS = [
    { v: 'matches',  l: '⚽ 경기 관리' },
    { v: 'calendar', l: '📅 시합 일정' },
    { v: 'bets',     l: '🎯 경기 베팅 현황' },
    { v: 'users',    l: '📊 회원 손익 현황' },
    { v: 'points',   l: '💰 포인트 통계' },
    { v: 'simulator', l: '🤖 시뮬레이터 설정' },
  ]

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-bebas text-4xl md:text-5xl text-center text-wc-gold tracking-widest mb-2">
          ⚙️ 관리자 패널
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          경기 결과 입력 · 베팅 정산 자동화
        </p>

        {/* 전체 베팅 초기화 확인 모달 */}
        {resetAllConfirm && (
          <ConfirmModal
            message="모든 베팅을 초기화하시겠습니까?"
            subMessage="전체 베팅 삭제 · 모든 경기 결과 초기화 · 전체 회원 포인트 10만P으로 리셋됩니다."
            confirmLabel="전체 초기화"
            onConfirm={async () => {
              setResetAllConfirm(false)
              setResetAllLoading(true)
              setResetAllMsg('')
              try {
                const res = await api.delete('/admin/bets/all')
                setResetAllMsg(`완료: ${res.data.message}`)
                fetchAll()
              } catch (err) {
                setResetAllMsg(err.response?.data?.detail || '오류가 발생했습니다')
              } finally {
                setResetAllLoading(false)
              }
            }}
            onCancel={() => setResetAllConfirm(false)}
          />
        )}

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatCard label="총 회원" value={stats.total_users.toLocaleString()} color="text-blue-400" />
            <StatCard label="총 베팅 수" value={stats.total_bets.toLocaleString()} color="text-wc-gold" />
            <StatCard label="총 베팅 포인트" value={`${(stats.total_bet_amount / 10000).toFixed(0)}만P`} color="text-green-400" />
          </div>
        )}

        {/* 시뮬레이션 확인 모달 */}
        {simConfirm && (
          <ConfirmModal
            message="배팅 시뮬레이션을 실행하시겠습니까?"
            subMessage="전체 회원이 예선전 경기에 임의 베팅합니다. 이미 베팅한 경기는 중복되지 않습니다."
            confirmLabel="시뮬레이션 실행"
            onConfirm={async () => {
              setSimConfirm(false)
              setSimLoading(true)
              setSimMsg('')
              try {
                const res = await api.post('/admin/bets/simulate')
                setSimMsg(`완료: ${res.data.message}`)
                fetchAll()
              } catch (err) {
                setSimMsg(err.response?.data?.detail || '오류가 발생했습니다')
              } finally {
                setSimLoading(false)
              }
            }}
            onCancel={() => setSimConfirm(false)}
          />
        )}

        {/* 액션 버튼 영역 */}
        <div className="flex items-center justify-end gap-3 mb-6 flex-wrap">
          {simMsg && (
            <span className={`text-xs ${simMsg.startsWith('완료') ? 'text-green-400' : 'text-red-400'}`}>
              {simMsg}
            </span>
          )}
          {resetAllMsg && (
            <span className={`text-xs ${resetAllMsg.startsWith('완료') ? 'text-green-400' : 'text-red-400'}`}>
              {resetAllMsg}
            </span>
          )}
          <button
            onClick={() => setSimConfirm(true)}
            disabled={simLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(27,61,110,0.35)',
              border: '1px solid rgba(59,130,246,0.5)',
              color: '#60a5fa',
            }}
          >
            {simLoading ? '시뮬레이션 중...' : '🎲 배팅 시뮬레이션'}
          </button>
          <button
            onClick={() => setResetAllConfirm(true)}
            disabled={resetAllLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(139,30,47,0.25)',
              border: '1px solid rgba(139,30,47,0.6)',
              color: '#f87171',
            }}
          >
            {resetAllLoading ? '초기화 중...' : '🗑 모든 베팅 초기화'}
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 border-b border-white/8 pb-3">
          {TABS.map(({ v, l }) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === v ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'}`}
              style={tab !== v ? {background:'rgba(255,255,255,0.05)'} : {}}>
              {l}
            </button>
          ))}
        </div>

        {/* 경기 관리 탭 */}
        {tab === 'matches' && (
          <>
            <div className="flex gap-2 mb-5 flex-wrap">
              {[{v:'upcoming',l:'예정'},{v:'ongoing',l:'LIVE'},{v:'finished',l:'종료'},{v:'all',l:'전체'}].map(({ v, l }) => (
                <button key={v} onClick={() => setFilter(v)}
                  style={filter !== v ? {background:'rgba(255,255,255,0.05)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.1)'} : {}}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === v ? 'bg-wc-gold text-black' : 'text-gray-400 hover:border-wc-gold/40'}`}>
                  {l} ({matches.filter((m) => v === 'all' || m.status === v).length})
                </button>
              ))}
            </div>
            {loading ? (
              <div className="text-center text-gray-500 py-20">로딩 중...</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((m) => (
                  <MatchResultRow key={m.id} match={m} onUpdated={fetchAll} pendingBetCount={pendingCounts[m.id] ?? 0} />
                ))}
                {filtered.length === 0 && <div className="text-center text-gray-500 py-10">해당하는 경기가 없습니다</div>}
              </div>
            )}
          </>
        )}

        {/* 경기 베팅 현황 탭 */}
        {tab === 'calendar' && <ScheduleCalendarTab matches={matches} onMatchesUpdated={fetchAll} />}
        {tab === 'bets' && <MatchBetsTab matches={matches} pendingCounts={pendingCounts} />}

        {/* 회원 손익 현황 탭 */}
        {tab === 'users' && <UserProfitTab />}

        {/* 포인트 통계 탭 */}
        {tab === 'points' && <PointStatsTab />}

        {/* 시뮬레이터 설정 탭 */}
        {tab === 'simulator' && <SimulatorSettingsTab />}
      </div>
    </div>
  )
}
