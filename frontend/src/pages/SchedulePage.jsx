import { useState, useEffect, useMemo } from 'react'
import api from '../api'
import { getFlagUrl } from '../utils/flags'
import FifaBadge from '../components/FifaBadge'
import { getFifaRank, getPowerRank } from '../utils/rankings'
import VenueModal, { getVenueNameKo } from '../components/VenueModal'

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

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const STAGE_LABEL = {
  group: '조별리그', round_of_32: '32강', round_of_16: '16강',
  quarterfinal: '8강', semifinal: '4강', third_place: '3/4위', final: '결승',
}
const STATUS_BADGE = {
  upcoming: { label: '예정', cls: 'bg-gray-700 text-gray-300' },
  ongoing:  { label: 'LIVE', cls: 'bg-red-600 text-white animate-pulse' },
  finished: { label: '종료', cls: 'bg-green-800 text-green-300' },
}

function formatKST(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── 순위 계산 ─────────────────────────────────────────────────────────────
function calcStandings(groupMatches) {
  const teams = {}
  groupMatches.forEach((m) => {
    if (!teams[m.home_team]) teams[m.home_team] = { name: m.home_team, flag: m.home_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }
    if (!teams[m.away_team]) teams[m.away_team] = { name: m.away_team, flag: m.away_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }
  })
  groupMatches.forEach((m) => {
    if (m.status !== 'finished') return
    const h = teams[m.home_team], a = teams[m.away_team]
    h.p++; a.p++
    h.gf += m.home_score; h.ga += m.away_score
    a.gf += m.away_score; a.ga += m.home_score
    if (m.home_score > m.away_score)      { h.w++; a.l++ }
    else if (m.home_score < m.away_score) { h.l++; a.w++ }
    else                                  { h.d++; a.d++ }
  })
  return Object.values(teams).sort((a, b) => {
    const ap = a.w * 3 + a.d, bp = b.w * 3 + b.d
    if (bp !== ap) return bp - ap
    const agd = a.gf - a.ga, bgd = b.gf - b.ga
    if (bgd !== agd) return bgd - agd
    if (b.gf !== a.gf) return b.gf - a.gf
    // 아직 경기 결과가 없어 동률일 때는 전문가 파워랭킹(최근 폼·전력 분석 기반,
    // 낮을수록 강팀)을 1순위로, FIFA 랭킹을 보조 근거로 삼아 진출을 예측
    const apr = getPowerRank(a.name) ?? 999, bpr = getPowerRank(b.name) ?? 999
    if (apr !== bpr) return apr - bpr
    const ar = getFifaRank(a.name) ?? 999, br = getFifaRank(b.name) ?? 999
    if (ar !== br) return ar - br
    return a.name.localeCompare(b.name)
  })
}

// ── 전체 조 분석: 조별 순위 + 3위 진출 예측 ──────────────────────────────
function analyzeAllGroups(allMatches) {
  const result = {}
  GROUPS.forEach((g) => {
    const gm = allMatches.filter((m) => m.group_name === g)
    const standings = calcStandings(gm)
    const finished = gm.filter((m) => m.status === 'finished').length
    result[g] = { standings, finished, total: gm.length }
  })

  // 3위팀 모아서 순위 결정 (승점 → 득실 → 득점)
  const thirds = GROUPS
    .filter((g) => result[g].standings.length >= 3)
    .map((g) => {
      const t = result[g].standings[2]
      return { group: g, pts: t.w * 3 + t.d, gd: t.gf - t.ga, gf: t.gf, name: t.name }
    })
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  const top8Third = new Set(thirds.slice(0, 8).map((t) => `${t.group}:${t.name}`))

  return { byGroup: result, top8Third }
}

// ── 팀별 진출 상태 ────────────────────────────────────────────────────────
function getAdvStatus(rank, team, groupFinished, allGroupsDone, top8Third, groupKey) {
  const key = `${groupKey}:${team.name}`
  const pts = team.w * 3 + team.d
  const gamesLeft = 3 - team.p

  if (rank === 0 || rank === 1) {
    if (groupFinished) return { label: '32강 진출 확정', color: 'text-green-400', bg: 'bg-green-900/30', dot: '🟢' }
    // 수학적 확정: 3경기 이상 남아도 추월 불가할 때는 단순히 예측으로
    return { label: '32강 진출 예측', color: 'text-green-300', bg: 'bg-green-900/20', dot: '🟢' }
  }
  if (rank === 2) {
    if (groupFinished) {
      return top8Third.has(key)
        ? { label: '3위 와일드카드 진출', color: 'text-yellow-300', bg: 'bg-yellow-900/25', dot: '🟡' }
        : { label: '3위 탈락', color: 'text-orange-400', bg: 'bg-orange-900/20', dot: '🟠' }
    }
    return { label: '3위 경쟁 중', color: 'text-yellow-400', bg: 'bg-yellow-900/20', dot: '🟡' }
  }
  // rank === 3
  if (groupFinished) return { label: '탈락', color: 'text-red-400', bg: 'bg-red-900/20', dot: '🔴' }
  if (gamesLeft === 0) return { label: '탈락', color: 'text-red-400', bg: 'bg-red-900/20', dot: '🔴' }
  return { label: '탈락 예측', color: 'text-red-400/70', bg: 'bg-red-900/10', dot: '🔴' }
}

// ── 조 순위표 컴포넌트 ────────────────────────────────────────────────────
function GroupStandings({ groupKey, groupData, top8Third }) {
  const { standings, finished, total } = groupData
  if (!standings.length) return null

  const groupFinished = finished === total && total > 0
  const hasResults = finished > 0
  const label = groupFinished ? '확정' : hasResults ? '예측' : '예정'
  const labelColor = groupFinished ? 'text-green-400' : hasResults ? 'text-yellow-400' : 'text-gray-500'

  return (
    <div className="wc-card p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bebas text-lg text-white tracking-wider">Group {groupKey} 순위표</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${labelColor}`}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid currentColor' }}>
          {label}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-white/5">
              <th className="text-left py-1.5 pr-2 w-5">#</th>
              <th className="text-left py-1.5 min-w-[100px]">팀</th>
              <th className="text-center py-1.5 w-8">경기</th>
              <th className="text-center py-1.5 w-8">승</th>
              <th className="text-center py-1.5 w-8">무</th>
              <th className="text-center py-1.5 w-8">패</th>
              <th className="text-center py-1.5 w-12">득실</th>
              <th className="text-center py-1.5 w-8 font-bold text-white">승점</th>
              <th className="text-left py-1.5 pl-3">진출 예측</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team, rank) => {
              const pts = team.w * 3 + team.d
              const gd = team.gf - team.ga
              const adv = getAdvStatus(rank, team, groupFinished, false, top8Third, groupKey)
              return (
                <tr
                  key={team.name}
                  className={`border-b border-white/5 last:border-0 ${rank < 2 ? 'bg-green-900/10' : ''}`}
                >
                  <td className="py-2 pr-2 text-gray-500 font-bold">{rank + 1}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      <FlagImg name={team.name} emoji={team.flag} size={24} />
                      <span className="text-white font-medium">{team.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 text-gray-400">{team.p}</td>
                  <td className="text-center py-2 text-gray-300">{team.w}</td>
                  <td className="text-center py-2 text-gray-300">{team.d}</td>
                  <td className="text-center py-2 text-gray-300">{team.l}</td>
                  <td className={`text-center py-2 font-medium ${gd > 0 ? 'text-green-400' : gd < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {gd > 0 ? `+${gd}` : gd}
                  </td>
                  <td className="text-center py-2">
                    <span className="font-bebas text-base text-wc-gold">{pts}</span>
                  </td>
                  <td className="py-2 pl-3">
                    <span className={`text-[11px] font-medium ${adv.color} flex items-center gap-1`}>
                      <span>{adv.dot}</span>
                      <span>{adv.label}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!groupFinished && hasResults && (
        <p className="text-[10px] text-gray-600 mt-2">
          * 현재 결과 기준 예측 · 남은 경기 결과에 따라 변동될 수 있습니다
        </p>
      )}
      {!hasResults && (
        <p className="text-[10px] text-gray-600 mt-2">* 경기 결과가 입력되면 자동으로 업데이트됩니다</p>
      )}
    </div>
  )
}

// ── 경기 카드 ─────────────────────────────────────────────────────────────
function MatchCard({ match, onVenueClick }) {
  const badge = STATUS_BADGE[match.status] || STATUS_BADGE.upcoming

  return (
    <div className={`wc-card p-4 ${match.is_korea_match ? 'border-wc-gold/50' : ''}`}>
      {match.is_korea_match && (
        <div className="text-xs text-wc-gold font-bold mb-2">🇰🇷 한국 경기</div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex items-center justify-end gap-2">
          <div className="text-right">
            <div className="text-sm font-bold text-white whitespace-nowrap">{match.home_team}</div>
            <div className="flex justify-end mt-0.5"><FifaBadge name={match.home_team} /></div>
          </div>
          <FlagImg name={match.home_team} emoji={match.home_flag} size={36} />
        </div>
        <div className="flex flex-col items-center min-w-[80px]">
          <span className={`text-xs px-2 py-0.5 rounded-full mb-1 ${badge.cls}`}>{badge.label}</span>
          {match.status === 'finished' ? (
            <div className="font-bebas text-2xl text-wc-gold">{match.home_score} : {match.away_score}</div>
          ) : (
            <div className="font-bebas text-lg text-gray-400">VS</div>
          )}
        </div>
        <div className="flex-1 flex items-center justify-start gap-2">
          <FlagImg name={match.away_team} emoji={match.away_flag} size={36} />
          <div>
            <div className="text-sm font-bold text-white whitespace-nowrap">{match.away_team}</div>
            <FifaBadge name={match.away_team} className="mt-0.5" />
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs text-gray-500">
        <span>📅 {formatKST(match.match_date)} KST</span>
        <button
          onClick={() => onVenueClick?.(match.venue)}
          className="flex items-center gap-1 hover:text-wc-gold transition-colors group"
          title="경기장 정보 보기"
        >
          📍 <span className="group-hover:underline">{getVenueNameKo(match.venue)}</span>
        </button>
      </div>
    </div>
  )
}


const KNOCKOUT_STAGES = [
  { key: 'round_of_32', label: '32강',  count: 16 },
  { key: 'round_of_16', label: '16강',  count: 8  },
  { key: 'quarterfinal',label: '8강',   count: 4  },
  { key: 'semifinal',   label: '4강',   count: 2  },
  { key: 'third_place', label: '3위전', count: 1  },
  { key: 'final',       label: '결승',  count: 1  },
]

// ── 팀 슬롯 표시 헬퍼 ────────────────────────────────────────────────────
function TeamSlot({ name, flag, slot, side }) {
  const isConfirmed = name && name !== '미정'
  const isRight = side === 'right'

  if (isConfirmed) {
    return (
      <div className={`flex-1 flex items-center gap-2 ${isRight ? 'justify-start' : 'justify-end'}`}>
        {!isRight && (
          <div className="text-right">
            <div className="text-sm font-bold text-white whitespace-nowrap">{name}</div>
          </div>
        )}
        <FlagImg name={name} emoji={flag} size={34} />
        {isRight && (
          <div className="text-sm font-bold text-white whitespace-nowrap">{name}</div>
        )}
      </div>
    )
  }

  // 미정 — 슬롯 레이블 표시
  return (
    <div className={`flex-1 flex items-center gap-2 ${isRight ? 'justify-start' : 'justify-end'}`}>
      {!isRight && slot && (
        <span className="text-[11px] font-medium text-blue-300 text-right leading-tight">{slot}</span>
      )}
      <div className="w-9 h-6 rounded border border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-white/20 text-xs">?</span>
      </div>
      {isRight && slot && (
        <span className="text-[11px] font-medium text-blue-300 leading-tight">{slot}</span>
      )}
    </div>
  )
}

// ── 토너먼트 경기 카드 (DB 데이터 기반) ──────────────────────────────────
function KnockoutCard({ match, num, stageLabel }) {
  const isConfirmed = match.home_team && match.home_team !== '미정'
  const badge = STATUS_BADGE[match.status] || STATUS_BADGE.upcoming

  return (
    <div className={`wc-card p-4 ${match.is_korea_match ? 'border-wc-gold/50' : ''}`}>
      {match.is_korea_match && (
        <div className="text-xs text-wc-gold font-bold mb-2">🇰🇷 한국 경기</div>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-wc-gold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.3)' }}>
          {stageLabel} {num}경기
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TeamSlot name={match.home_team} flag={match.home_flag} slot={match.home_slot} side="left" />

        <div className="flex flex-col items-center min-w-[72px]">
          {match.status === 'finished' ? (
            <div className="font-bebas text-2xl text-wc-gold">{match.home_score} : {match.away_score}</div>
          ) : (
            <div className="font-bebas text-lg text-gray-500">VS</div>
          )}
        </div>

        <TeamSlot name={match.away_team} flag={match.away_flag} slot={match.away_slot} side="right" />
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs text-gray-500">
        <span>📅 {formatKST(match.match_date)} KST</span>
        <span>📍 {getVenueNameKo(match.venue)}</span>
      </div>
    </div>
  )
}

// ── 토너먼트 섹션 ─────────────────────────────────────────────────────────
function TournamentSection({ dbMatches }) {
  const [stage, setStage] = useState('round_of_32')
  const current = KNOCKOUT_STAGES.find((s) => s.key === stage)

  // DB에서 해당 스테이지 경기를 날짜순으로 가져옴
  const stageMatches = dbMatches
    .filter((m) => m.stage === stage)
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))

  const confirmedCount = stageMatches.filter((m) => m.home_team !== '미정').length

  return (
    <div>
      {/* 라운드 탭 */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {KNOCKOUT_STAGES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStage(s.key)}
            style={stage !== s.key ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
            className={`px-4 py-2 rounded-lg font-bebas text-base tracking-wider transition-all ${
              stage === s.key ? 'bg-wc-gold text-black glow-box-gold' : 'text-gray-300 hover:border-wc-gold/40'
            }`}
          >
            {s.label}
            <span className={`ml-1.5 text-xs font-sans ${stage === s.key ? 'text-black/60' : 'text-gray-500'}`}>
              ({s.count})
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <h2 className="font-bebas text-2xl text-white tracking-wider">{current?.label}</h2>
        {confirmedCount > 0 && confirmedCount < stageMatches.length && (
          <span className="text-xs text-yellow-400 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}>
            {confirmedCount}/{stageMatches.length} 확정
          </span>
        )}
        {confirmedCount === stageMatches.length && stageMatches.length > 0 && (
          <span className="text-xs text-green-400 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
            대진 확정
          </span>
        )}
      </div>

      <div className={stageMatches.length === 1 ? 'flex justify-center' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
        {stageMatches.map((m, i) => (
          <div key={m.id} className={stageMatches.length === 1 ? 'w-full max-w-md' : ''}>
            <KnockoutCard match={m} num={i + 1} stageLabel={current?.label} />
          </div>
        ))}
        {stageMatches.length === 0 && (
          <div className="col-span-2 text-center text-gray-500 py-10">경기 데이터를 불러오는 중...</div>
        )}
      </div>

      {confirmedCount < stageMatches.length && (
        <p className="text-center text-xs text-gray-600 mt-6">
          * 파란색 레이블은 조별리그 결과에 따라 결정될 팀 위치입니다
        </p>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [mode, setMode] = useState('group')
  const [venueModal, setVenueModal] = useState(null)

  useEffect(() => {
    api.get('/matches').then((r) => { setMatches(r.data); setLoading(false) })
  }, [])

  const { byGroup, top8Third } = useMemo(() => analyzeAllGroups(matches), [matches])
  const groupedMatches = matches.filter((m) => m.group_name === selectedGroup)

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-bebas text-4xl md:text-6xl text-center text-wc-gold tracking-widest mb-2">
          전체 대진표
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          2026 FIFA World Cup · 48팀 · 조별리그 · 상위 2팀 + 3위 와일드카드 8팀 = 32강
        </p>

        {/* 모드 전환 탭 */}
        <div className="flex justify-center gap-2 mb-8">
          {[{ v: 'group', l: '조별리그' }, { v: 'knockout', l: '토너먼트' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setMode(v)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                mode === v
                  ? 'bg-wc-gold text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={mode !== v ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' } : {}}
            >
              {l}
            </button>
          ))}
        </div>

        {mode === 'knockout' ? (
          <TournamentSection dbMatches={matches} />
        ) : (
          <>
            {/* 조 탭 */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {GROUPS.map((g) => {
                const gd = byGroup[g]
                const hasResult = gd && gd.finished > 0
                return (
                  <button
                    key={g}
                    onClick={() => setSelectedGroup(g)}
                    style={selectedGroup !== g ? { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' } : {}}
                    className={`relative w-10 h-10 rounded-lg font-bebas text-lg transition-all ${
                      selectedGroup === g ? 'bg-wc-gold text-black glow-box-gold' : 'text-gray-300 hover:border-wc-gold/40'
                    }`}
                  >
                    {g}
                    {hasResult && selectedGroup !== g && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className="text-center text-gray-500 py-20">경기 데이터를 불러오는 중...</div>
            ) : (
              <>
                <h2 className="font-bebas text-2xl text-white tracking-wider mb-4 text-center">
                  Group {selectedGroup}{selectedGroup === 'A' && ' 🇰🇷'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupedMatches.map((m) => <MatchCard key={m.id} match={m} onVenueClick={setVenueModal} />)}
                  {groupedMatches.length === 0 && (
                    <div className="col-span-2 text-center text-gray-500 py-10">경기 데이터가 없습니다</div>
                  )}
                </div>
                {byGroup[selectedGroup] && (
                  <GroupStandings groupKey={selectedGroup} groupData={byGroup[selectedGroup]} top8Third={top8Third} />
                )}
              </>
            )}
          </>
        )}
      </div>

      {venueModal && (
        <VenueModal venue={venueModal} onClose={() => setVenueModal(null)} />
      )}
    </div>
  )
}
