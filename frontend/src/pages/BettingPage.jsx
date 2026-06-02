import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import useStore from '../store/useStore'
import { getFlagUrl } from '../utils/flags'
import FifaBadge from '../components/FifaBadge'

function FlagImg({ name, emoji, size = 32 }) {
  const [failed, setFailed] = useState(false)
  const url = getFlagUrl(name)
  if (!url || failed) return <span style={{ fontSize: size * 0.75 }}>{emoji}</span>
  return (
    <img
      src={url}
      alt={name}
      width={size}
      className="rounded-sm object-cover shadow-sm flex-shrink-0"
      style={{ height: Math.round(size * 0.67) }}
      onError={() => setFailed(true)}
    />
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

function OddsBar({ label, odds, total, totalPool, color }) {
  const pct = totalPool > 0 ? Math.round((total / totalPool) * 100) : 33
  return (
    <div className="flex-1">
      <div className="text-xs text-gray-400 mb-1 text-center truncate">{label}</div>
      <div className="h-2 bg-gray-800 rounded-full mb-1">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-center">
        <span className="font-bebas text-lg" style={{ color }}>{odds > 0 ? `${odds}배` : '-'}</span>
        <div className="text-[10px] text-gray-500">{pct}% · {total.toLocaleString()}P</div>
      </div>
    </div>
  )
}

function MatchBetCard({ match, myBet, onBetPlaced }) {
  const { user, refreshUser } = useStore()
  const [odds, setOdds] = useState(null)
  const [prediction, setPrediction] = useState('')
  const [amount, setAmount] = useState(10000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    api.get(`/bets/odds/${match.id}`).then((r) => setOdds(r.data)).catch(() => {})
  }, [match.id, success])

  const handleBet = async () => {
    if (!prediction) { setError('승/무/패를 선택하세요'); return }
    if (amount < 1000) { setError('최소 1,000P 이상 베팅하세요'); return }
    if (amount > (user?.points || 0)) { setError(`포인트가 부족합니다 (보유: ${(user?.points || 0).toLocaleString()}P)`); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/bets', { match_id: match.id, prediction, amount })
    } catch (err) {
      setError(err.response?.data?.detail || '베팅 실패')
      setLoading(false)
      return
    }
    setSuccess(true)
    setLoading(false)
    await refreshUser()
    onBetPlaced()
  }

  const handleEditBet = async () => {
    if (!prediction) { setError('승/무/패를 선택하세요'); return }
    if (amount < 1000) { setError('최소 1,000P 이상 베팅하세요'); return }
    setError('')
    setLoading(true)
    try {
      await api.put(`/bets/${myBet.id}`, { prediction, amount })
    } catch (err) {
      setError(err.response?.data?.detail || '수정 실패')
      setLoading(false)
      return
    }
    setEditMode(false)
    setLoading(false)
    await refreshUser()
    onBetPlaced()
  }

  const enterEditMode = () => {
    setPrediction(myBet.prediction)
    setAmount(myBet.amount)
    setError('')
    setEditMode(true)
  }

  const isFinished = match.status === 'finished'
  const isOngoing = match.status === 'ongoing'
  const canBet = !isFinished && !isOngoing && !myBet && user
  const canEdit = myBet?.status === 'pending' && !isFinished && !isOngoing &&
    (new Date(match.match_date).getTime() - Date.now() > 3600000)

  const PRED_OPTS = [
    { value: 'home', flag: match.home_flag, flagName: match.home_team, label: `${match.home_team} 승`, color: '#4ade80' },
    { value: 'draw', flag: null,            flagName: null,            label: '무승부',                color: '#facc15' },
    { value: 'away', flag: match.away_flag, flagName: match.away_team, label: `${match.away_team} 승`, color: '#f87171' },
  ]

  return (
    <div className={`wc-card p-5 ${match.is_korea_match ? 'border-wc-gold/40' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {match.is_korea_match && <span className="text-xs text-wc-gold font-bold bg-wc-gold/10 px-2 py-0.5 rounded-full">🇰🇷 한국</span>}
          <span className="text-xs text-gray-500">{formatKST(match.match_date)} · {match.city} · Group {match.group_name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
          isFinished ? 'bg-green-800 text-green-300' :
          isOngoing  ? 'bg-red-600 text-white animate-pulse' :
          'bg-gray-700 text-gray-300'
        }`}>
          {isFinished ? '종료' : isOngoing ? 'LIVE' : '예정'}
        </span>
      </div>

      <div className="flex items-center justify-center gap-6 mb-5">
        <div className="text-center">
          <div className="flex justify-center mb-1">
            <FlagImg name={match.home_team} emoji={match.home_flag} size={40} />
          </div>
          <div className="font-bold text-sm">{match.home_team}</div>
          <FifaBadge name={match.home_team} className="mt-1" />
        </div>
        <div className="font-bebas text-2xl text-gray-500">
          {isFinished ? `${match.home_score} : ${match.away_score}` : 'VS'}
        </div>
        <div className="text-center">
          <div className="flex justify-center mb-1">
            <FlagImg name={match.away_team} emoji={match.away_flag} size={40} />
          </div>
          <div className="font-bold text-sm">{match.away_team}</div>
          <FifaBadge name={match.away_team} className="mt-1" />
        </div>
      </div>

      {odds && (
        <div className="flex gap-3 mb-5">
          <OddsBar label={`${match.home_team} 승`} odds={odds.home_odds} total={odds.total_home} totalPool={odds.total_pool} color="#4ade80" />
          <OddsBar label="무승부" odds={odds.draw_odds} total={odds.total_draw} totalPool={odds.total_pool} color="#facc15" />
          <OddsBar label={`${match.away_team} 승`} odds={odds.away_odds} total={odds.total_away} totalPool={odds.total_pool} color="#f87171" />
        </div>
      )}

      {myBet && !editMode && (
        <div>
          <div className={`rounded-lg p-3 text-sm text-center ${
            myBet.status === 'won'      ? 'bg-green-900/40 border border-green-500/30 text-green-400' :
            myBet.status === 'lost'     ? 'bg-red-900/40 border border-red-500/30 text-red-400' :
            myBet.status === 'refunded' ? 'bg-gray-800/40 border border-gray-500/30 text-gray-400' :
            'bg-wc-gold/10 border border-wc-gold/30 text-wc-gold'
          }`}>
            {myBet.status === 'won'      && `✅ 적중! +${myBet.payout?.toLocaleString()}P 획득`}
            {myBet.status === 'lost'     && `❌ 미적중 · ${myBet.amount.toLocaleString()}P 잃음`}
            {myBet.status === 'refunded' && `↩ 환불 · ${myBet.amount.toLocaleString()}P 반환됨`}
            {myBet.status === 'pending'  && `⏳ 베팅 중 · ${myBet.amount.toLocaleString()}P · ${
              myBet.prediction === 'home' ? `${match.home_team} 승` :
              myBet.prediction === 'draw' ? '무승부' : `${match.away_team} 승`
            }`}
          </div>
          {canEdit && (
            <button
              onClick={enterEditMode}
              className="mt-2 w-full py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.35)', color: '#C8A84B' }}
            >
              ✏️ 베팅 수정 (경기 1시간 전까지 가능)
            </button>
          )}
        </div>
      )}

      {myBet && editMode && (
        <div className="space-y-3">
          <div className="text-xs text-wc-gold/70 text-center mb-1">✏️ 베팅 수정 중</div>
          <div className="grid grid-cols-3 gap-2">
            {PRED_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPrediction(opt.value)}
                className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                  prediction === opt.value ? 'border-2' : 'border border-white/10 text-gray-400 hover:border-white/30'
                }`}
                style={prediction === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}15` } : {}}
              >
                {opt.flagName && <FlagImg name={opt.flagName} emoji={opt.flag} size={24} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1000}
              max={(user?.points || 0) + myBet.amount}
              step={1000}
              className="glass-input flex-1 px-3 py-2 text-sm"
            />
            <div className="flex gap-1">
              {[10000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="text-[10px] px-2 rounded text-gray-400 hover:text-wc-gold transition-colors"
                  style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)'}}
                >
                  {v >= 10000 ? `${v / 10000}만` : v}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setEditMode(false); setError('') }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              취소
            </button>
            <button onClick={handleEditBet} disabled={loading} className="btn-gold flex-1 py-2.5 text-sm">
              {loading ? '처리 중...' : `✅ ${amount.toLocaleString()}P 로 수정`}
            </button>
          </div>
        </div>
      )}

      {canBet && !success && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PRED_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPrediction(opt.value)}
                className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                  prediction === opt.value ? 'border-2' : 'border border-white/10 text-gray-400 hover:border-white/30'
                }`}
                style={prediction === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}15` } : {}}
              >
                {opt.flagName && <FlagImg name={opt.flagName} emoji={opt.flag} size={24} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1000}
              max={user?.points || 0}
              step={1000}
              className="glass-input flex-1 px-3 py-2 text-sm"
            />
            <div className="flex gap-1">
              {[10000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="text-[10px] px-2 rounded text-gray-400 hover:text-wc-gold transition-colors"
                  style={{background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)'}}
                >
                  {v >= 10000 ? `${v / 10000}만` : v}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button onClick={handleBet} disabled={loading} className="btn-gold w-full py-2.5 text-sm">
            {loading ? '처리 중...' : `🎯 ${amount.toLocaleString()}P 베팅`}
          </button>
        </div>
      )}

      {success && (
        <div className="text-center text-green-400 text-sm py-2">✅ 베팅 완료! 경기 결과를 기다려주세요.</div>
      )}

      {!user && !isFinished && (
        <Link to="/auth" className="block text-center text-wc-gold text-sm hover:underline mt-2">
          로그인하여 베팅하기 →
        </Link>
      )}
    </div>
  )
}

function Leaderboard() {
  const [board, setBoard] = useState([])

  useEffect(() => {
    api.get('/bets/leaderboard').then((r) => setBoard(r.data))
  }, [])

  if (board.length === 0) return null

  return (
    <div className="wc-card p-5">
      <h3 className="font-bebas text-xl text-wc-gold tracking-wider mb-4">🏆 포인트 랭킹</h3>
      <div className="space-y-2">
        {board.slice(0, 10).map((u) => (
          <div key={u.rank} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3">
              <span className={`font-bebas text-lg w-6 text-center ${
                u.rank === 1 ? 'text-yellow-400' : u.rank === 2 ? 'text-gray-300' : u.rank === 3 ? 'text-orange-400' : 'text-gray-500'
              }`}>{u.rank}</span>
              <span className="text-sm text-white">{u.nickname}</span>
            </div>
            <span className="text-wc-gold font-bold text-sm">{u.points.toLocaleString()}P</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 내 베팅 목록 뷰 ──────────────────────────────────────────────────────
function MyBetsView({ myBets, matches, user, onRefresh }) {
  const PRED_KO    = { home: '홈 승', draw: '무승부', away: '원정 승' }
  const PRED_COLOR = { home: 'text-green-400', draw: 'text-yellow-400', away: 'text-red-400' }
  const STATUS_KO  = { pending: '대기 중', won: '✅ 적중', lost: '❌ 미적중', refunded: '↩ 환불' }
  const STATUS_CLS = { pending: 'text-gray-400', won: 'text-green-400', lost: 'text-red-400', refunded: 'text-gray-500' }

  if (!user) return (
    <div className="text-center py-20">
      <p className="text-gray-500 text-sm mb-3">로그인 후 베팅 내역을 확인할 수 있습니다</p>
      <a href="/worldcup2026/auth" className="btn-gold text-sm py-2 px-5 inline-block">로그인</a>
    </div>
  )

  if (myBets.length === 0) return (
    <div className="text-center py-20 text-gray-500">아직 베팅 내역이 없습니다</div>
  )

  const totalBet    = myBets.reduce((s, b) => s + b.amount, 0)
  const totalPayout = myBets.filter(b => b.status === 'won').reduce((s, b) => s + (b.payout || 0), 0)
  const netProfit   = myBets.reduce((s, b) =>
    b.status === 'won'  ? s + (b.payout - b.amount) :
    b.status === 'lost' ? s - b.amount : s, 0)
  const wonCount     = myBets.filter(b => b.status === 'won').length
  const lostCount    = myBets.filter(b => b.status === 'lost').length
  const pendingCount = myBets.filter(b => b.status === 'pending').length

  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '총 베팅',   value: `${myBets.length}건`,              color: 'text-white' },
          { label: '투자 포인트', value: `${totalBet.toLocaleString()}P`,   color: 'text-gray-300' },
          { label: '회수 포인트', value: `${totalPayout.toLocaleString()}P`, color: 'text-blue-400' },
          { label: '순손익',    value: `${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()}P`,
            color: netProfit > 0 ? 'text-green-400' : netProfit < 0 ? 'text-red-400' : 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="wc-card p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`font-bold text-lg ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* 상태 요약 뱃지 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: `대기 ${pendingCount}건`,  cls: 'text-gray-400',  bg: 'rgba(255,255,255,0.05)'  },
          { label: `적중 ${wonCount}건`,      cls: 'text-green-400', bg: 'rgba(34,197,94,0.1)'     },
          { label: `미적중 ${lostCount}건`,   cls: 'text-red-400',   bg: 'rgba(239,68,68,0.1)'     },
        ].map(({ label, cls, bg }) => (
          <span key={label} className={`text-xs font-bold px-3 py-1 rounded-full ${cls}`}
            style={{ background: bg, border: `1px solid currentColor`, borderColor: 'inherit', opacity: 0.9 }}>
            {label}
          </span>
        ))}
      </div>

      {/* 베팅 목록 */}
      <div className="wc-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 text-gray-500">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">경기</th>
              <th className="text-center px-3 py-3">예측</th>
              <th className="text-right px-4 py-3">베팅액</th>
              <th className="text-center px-3 py-3">결과</th>
              <th className="text-right px-4 py-3">손익</th>
            </tr>
          </thead>
          <tbody>
            {myBets.map((b, i) => {
              const m = matches.find(x => x.id === b.match_id)
              const profit = b.status === 'won'  ? (b.payout - b.amount) :
                             b.status === 'lost' ? -b.amount : null
              return (
                <tr key={b.id} className={`border-b border-white/5 transition-colors ${
                  b.status === 'won'  ? 'hover:bg-green-900/10' :
                  b.status === 'lost' ? 'hover:bg-red-900/10'   : 'hover:bg-white/3'
                }`}>
                  <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3">
                    {m ? (
                      <div className="flex items-center gap-1.5">
                        <FlagImg name={m.home_team} emoji={m.home_flag} size={18} />
                        <span className="text-white font-medium whitespace-nowrap">{m.home_team}</span>
                        <span className="text-gray-600 mx-0.5 font-bold text-[10px]">
                          {m.status === 'finished' ? `${m.home_score}:${m.away_score}` : 'vs'}
                        </span>
                        <span className="text-white font-medium whitespace-nowrap">{m.away_team}</span>
                        <FlagImg name={m.away_team} emoji={m.away_flag} size={18} />
                        <span className="text-gray-600 text-[10px] ml-1">Group {m.group_name}</span>
                      </div>
                    ) : <span className="text-gray-600">경기 정보 없음</span>}
                  </td>
                  <td className={`px-3 py-3 text-center font-bold ${PRED_COLOR[b.prediction]}`}>
                    {PRED_KO[b.prediction]}
                  </td>
                  <td className="px-4 py-3 text-right text-white">{b.amount.toLocaleString()}P</td>
                  <td className={`px-3 py-3 text-center font-bold text-xs ${STATUS_CLS[b.status]}`}>
                    {STATUS_KO[b.status]}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-600'
                  }`}>
                    {profit != null ? `${profit > 0 ? '+' : ''}${profit.toLocaleString()}P` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const GROUPS = ['전체', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const STATUS_FILTERS = [
  { v: 'all',      l: '전체' },
  { v: 'upcoming', l: '예정' },
  { v: 'ongoing',  l: 'LIVE' },
  { v: 'finished', l: '종료' },
]

export default function BettingPage() {
  const [matches, setMatches] = useState([])
  const [myBets, setMyBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [groupFilter, setGroupFilter] = useState('전체')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('matches') // 'matches' | 'mybets'
  const { user } = useStore()

  const fetchData = async () => {
    try {
      const [matchRes, betRes] = await Promise.all([
        api.get('/matches'),
        user ? api.get('/bets/my') : Promise.resolve({ data: [] }),
      ])
      setMatches(matchRes.data)
      setMyBets(betRes.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [user])

  const filtered = matches.filter((m) => {
    const groupOk = groupFilter === '전체' || m.group_name === groupFilter
    const statusOk = statusFilter === 'all' || m.status === statusFilter
    return groupOk && statusOk
  })

  const getMyBet = (matchId) => myBets.find((b) => b.match_id === matchId)

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-bebas text-4xl md:text-6xl text-center text-wc-gold tracking-widest mb-2">
          🎯 베팅
        </h1>
        <p className="text-center text-gray-500 text-sm mb-2">
          파리무추엘 베팅 · 승자 배당금 분배
        </p>
        {user ? (
          <p className="text-center text-wc-gold font-bold text-sm mb-6">
            보유 포인트: {user.points.toLocaleString()}P
          </p>
        ) : (
          <p className="text-center text-gray-500 text-sm mb-6">
            <Link to="/auth" className="text-wc-gold hover:underline">로그인</Link>하면 베팅에 참가할 수 있습니다
          </p>
        )}

        {/* 뷰 전환 탭 */}
        <div className="flex justify-center gap-2 mb-6">
          {[
            { v: 'matches', l: '🏟️ 경기 목록' },
            { v: 'mybets',  l: `🎫 내 베팅${user && myBets.length > 0 ? ` (${myBets.length})` : ''}` },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${view === v ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'}`}
              style={view !== v ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' } : {}}>
              {l}
            </button>
          ))}
        </div>

        {/* 내 베팅 뷰 */}
        {view === 'mybets' && (
          <MyBetsView myBets={myBets} matches={matches} user={user} onRefresh={fetchData} />
        )}

        {/* 경기 목록 뷰 */}
        {view === 'matches' && (
        <div>

        {/* 그룹 필터 */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                groupFilter === g
                  ? 'bg-wc-gold text-black'
                  : 'text-gray-400 hover:border-wc-gold/40'
              }`}
              style={groupFilter !== g ? {background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'} : {}}
            >
              {g === '전체' ? g : `Group ${g}`}
            </button>
          ))}
        </div>

        {/* 상태 필터 */}
        <div className="flex gap-1.5 mb-6">
          {STATUS_FILTERS.map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                statusFilter === v
                  ? 'bg-white/20 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={statusFilter !== v ? {background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'} : {border:'1px solid rgba(255,255,255,0.2)'}}
            >
              {l} ({matches.filter((m) => v === 'all' || m.status === v).length})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 경기 목록 */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="text-center text-gray-500 py-20">로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-20">해당하는 경기가 없습니다</div>
            ) : (
              filtered.map((m) => (
                <MatchBetCard key={m.id} match={m} myBet={getMyBet(m.id)} onBetPlaced={fetchData} />
              ))
            )}
          </div>

          {/* 사이드: 내 베팅 내역 + 랭킹 */}
          <div className="space-y-6">
            {user && myBets.length > 0 && (
              <div className="wc-card p-5">
                <h3 className="font-bebas text-xl text-wc-gold tracking-wider mb-3">내 베팅 내역</h3>
                <div className="space-y-2">
                  {myBets.map((b) => {
                    const m = matches.find((x) => x.id === b.match_id)
                    return (
                      <div key={b.id} className="text-xs flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 gap-2">
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          {m && <FlagImg name={m.home_team} emoji={m.home_flag} size={16} />}
                          {m && <FlagImg name={m.away_team} emoji={m.away_flag} size={16} />}
                        </span>
                        <span className={
                          b.status === 'won'      ? 'text-green-400' :
                          b.status === 'lost'     ? 'text-red-400' :
                          b.status === 'refunded' ? 'text-gray-500' :
                          'text-gray-400'
                        }>
                          {b.prediction === 'home' ? '홈 승' : b.prediction === 'draw' ? '무' : '원정 승'}
                        </span>
                        <span className="text-white whitespace-nowrap">{b.amount.toLocaleString()}P</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <Leaderboard />
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  )
}
