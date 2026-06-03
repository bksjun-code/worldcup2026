import { useState, useEffect, useCallback, useRef } from 'react'
import { getFlagUrl } from '../utils/flags'
import FifaBadge from '../components/FifaBadge'
import CountryMapModal from '../components/CountryMapModal'

// ── 국기 이미지 ─────────────────────────────────────────────────────────────
function FlagImg({ name, emoji, size = 48 }) {
  const [failed, setFailed] = useState(false)
  const url = getFlagUrl(name)
  if (!url || failed) return <span style={{ fontSize: size * 0.7 }}>{emoji}</span>
  return (
    <img
      src={url} alt={name} width={size}
      className="rounded object-cover shadow-md inline-block"
      style={{ height: Math.round(size * 0.67) }}
      onError={() => setFailed(true)}
    />
  )
}

// ── 상수 ─────────────────────────────────────────────────────────────────────
const CONF_COLORS = {
  UEFA:     { text: 'text-blue-400',   border: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  CONMEBOL: { text: 'text-green-400',  border: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  AFC:      { text: 'text-red-400',    border: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  CAF:      { text: 'text-yellow-400', border: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  CONCACAF: { text: 'text-purple-400', border: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}
const CONF_KO = {
  '전체':    '전체',
  'UEFA':    'UEFA (유럽)',
  'CONMEBOL':'CONMEBOL (남미)',
  'AFC':     'AFC (아시아)',
  'CAF':     'CAF (아프리카)',
  'CONCACAF':'CONCACAF (북중미)',
}
const CONFEDERATIONS = ['전체', 'UEFA', 'CONMEBOL', 'AFC', 'CAF', 'CONCACAF']

const TEAMS = [
  { flag:'🇰🇷', name:'대한민국',      group:'A', confederation:'AFC',      fifa_rank:23, coach:'홍명보',              titles:0, players:['손흥민','이강인','김민재'],                    best_result:'4강 (2002)',              desc:'2002 한일 월드컵 4강 신화. 손흥민을 앞세운 유럽파 황금 세대가 북중미에서 새 역사를 노린다.' },
  { flag:'🇨🇿', name:'체코',          group:'A', confederation:'UEFA',     fifa_rank:40, coach:'이반 하섹',           titles:0, players:['파트리크 쉬크','토마시 소우체크'],              best_result:'준우승 (1934, 체코슬)',    desc:'쉬크의 골 결정력과 소우체크의 중원 장악이 핵심. 탄탄한 조직력이 강점.' },
  { flag:'🇲🇽', name:'멕시코',        group:'A', confederation:'CONCACAF', fifa_rank:16, coach:'하비에르 아기레',     titles:0, players:['산티아고 히메네스','에드손 알바레스'],          best_result:'8강 (1970·1986)',         desc:'개최국. 히메네스의 결정력과 알바레스의 수비 안정감이 홈 이점과 시너지를 낸다.' },
  { flag:'🇿🇦', name:'남아공',        group:'A', confederation:'CAF',      fifa_rank:60, coach:'휴고 브로스',         titles:0, players:['페르시 타우','로날도 헤이드'],                  best_result:'조별리그 (2010)',          desc:'2010년 홈 월드컵 개최국. 타우의 드리블 돌파로 이변을 노린다.' },
  { flag:'🇺🇸', name:'미국',          group:'B', confederation:'CONCACAF', fifa_rank:13, coach:'그렉 버홀터',         titles:0, players:['크리스티안 풀리식','웨스턴 맥케니'],            best_result:'3위 (1930)',               desc:'개최국. 풀리식 등 유럽 빅클럽 선수들이 즐비. 홈 이점을 최대 활용할 팀.' },
  { flag:'🇨🇦', name:'캐나다',        group:'B', confederation:'CONCACAF', fifa_rank:47, coach:'제시 마쉬',           titles:0, players:['알퐁소 데이비스','조나단 데이비드'],            best_result:'조별리그 (2022)',          desc:'개최국. 데이비스의 폭발적인 측면 돌파가 핵심. 홈 팬들의 열렬한 성원.' },
  { flag:'🇺🇾', name:'우루과이',      group:'B', confederation:'CONMEBOL', fifa_rank:19, coach:'마르셀로 비엘사',     titles:2, players:['페데리코 발베르데','다르윈 누녜스'],            best_result:'우승 (1930·1950)',         desc:'최초의 월드컵 챔피언. 비엘사의 전술 아래 발베르데·누녜스 콤비가 활약.' },
  { flag:'🇵🇦', name:'파나마',        group:'B', confederation:'CONCACAF', fifa_rank:55, coach:'토마스 세비야노',     titles:0, players:['롤란도 블랙번','어밀카르 이닉시오'],            best_result:'조별리그 (2018)',          desc:'강한 체력과 조직적 수비로 강팀들을 괴롭히는 스타일의 팀.' },
  { flag:'🇪🇸', name:'스페인',        group:'C', confederation:'UEFA',     fifa_rank:8,  coach:'루이스 데 라 푸엔테', titles:1, players:['야말','페드리','로드리'],                      best_result:'우승 (2010)',              desc:'2010 챔피언. 야말이 이끄는 신세대 티키타카로 새 황금기를 열고 있다.' },
  { flag:'🇵🇹', name:'포르투갈',      group:'C', confederation:'UEFA',     fifa_rank:7,  coach:'로베르토 마르티네스', titles:0, players:['브루노 페르난데스','라파엘 레앙'],              best_result:'3위 (1966)',               desc:'황금세대 절정기. 레앙·페르난데스의 창의성이 세계 최고 수준의 공격진을 구성.' },
  { flag:'🇲🇦', name:'모로코',        group:'C', confederation:'CAF',      fifa_rank:14, coach:'왈리드 레그라기',     titles:0, players:['아슈라프 하키미','하킴 지예흐'],                best_result:'4강 (2022)',               desc:'2022 카타르 4강의 기적. 철벽 수비와 빠른 역습으로 유럽 강호를 잡는다.' },
  { flag:'🇨🇲', name:'카메룬',        group:'C', confederation:'CAF',      fifa_rank:50, coach:'리고베르 송',         titles:0, players:['앙기사','슈포-모팅','아보부카르'],              best_result:'8강 (1990)',               desc:'아프리카의 불굴 사자. 강인한 피지컬과 개인기가 무기.' },
  { flag:'🇧🇷', name:'브라질',        group:'D', confederation:'CONMEBOL', fifa_rank:5,  coach:'도리발 주니오르',     titles:5, players:['비니시우스','호드리구','에데르 밀리탕'],        best_result:'우승 (1958·62·70·94·2002)', desc:'역대 최다 5회 우승. 비니시우스의 폭발적 드리블과 호드리구의 창의성.' },
  { flag:'🇦🇷', name:'아르헨티나',    group:'D', confederation:'CONMEBOL', fifa_rank:1,  coach:'리오넬 스칼로니',     titles:3, players:['리오넬 메시','훌리안 알바레스','엔소 페르난데스'], best_result:'우승 (1978·1986·2022)',    desc:'현 세계 챔피언, FIFA 랭킹 1위. 메시의 마지막 무대에서 연속 우승 도전.' },
  { flag:'🇭🇷', name:'크로아티아',    group:'D', confederation:'UEFA',     fifa_rank:10, coach:'즐라트코 달리치',     titles:0, players:['루카 모드리치','코바치치','페리시치'],          best_result:'준우승 (2018)',            desc:'2018 준우승·2022 3위의 강호. 모드리치의 중원 지배력은 여전히 세계 최고.' },
  { flag:'🇨🇱', name:'칠레',          group:'D', confederation:'CONMEBOL', fifa_rank:36, coach:'리카르도 가레카',     titles:0, players:['알렉시스 산체스','아르투로 비달'],              best_result:'3위 (1962)',               desc:'코파 아메리카 2연패의 전통 강호. 강도 높은 전방 압박이 특기.' },
  { flag:'🇫🇷', name:'프랑스',        group:'E', confederation:'UEFA',     fifa_rank:2,  coach:'디디에 데샹',         titles:2, players:['킬리안 음바페','추아메니','마르시알'],           best_result:'우승 (1998·2018)',         desc:'1998·2018 챔피언. 음바페를 앞세운 세계 최강급 스쿼드. 강력한 피지컬과 역습의 대명사.' },
  { flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', name:'잉글랜드',    group:'E', confederation:'UEFA',     fifa_rank:4,  coach:'리 칼슬리',           titles:1, players:['해리 케인','주드 벨링엄','부카요 사카'],       best_result:'우승 (1966)',              desc:'축구의 발상지. 케인·벨링엄 콤비의 공격력이 절정기. 유로 연속 준우승 후 설욕 노린다.' },
  { flag:'🇸🇳', name:'세네갈',        group:'E', confederation:'CAF',      fifa_rank:20, coach:'알리우 시세',         titles:0, players:['사디오 마네','이드리사 게예','쿨리발리'],        best_result:'4강 (2002)',               desc:'2022 아프리카 네이션스컵 챔피언. 마네의 전방 압박과 쿨리발리의 철벽 수비.' },
  { flag:'🇹🇳', name:'튀니지',        group:'E', confederation:'CAF',      fifa_rank:32, coach:'잘렐 카둬',           titles:0, players:['이사암 잠리','유세프 음사크니'],                best_result:'조별리그',                desc:'아프리카 최고의 조직력. 탄탄한 수비 블록과 세트피스 강점.' },
  { flag:'🇳🇱', name:'네덜란드',      group:'F', confederation:'UEFA',     fifa_rank:6,  coach:'로날드 쿠만',         titles:0, players:['버질 반 다이크','코디 가크포'],                best_result:'준우승 (1974·1978·2010)',  desc:'토탈 풋볼의 나라. 반 다이크 중심의 철벽 수비. 3번의 결승 진출에도 우승은 미지수.' },
  { flag:'🇯🇵', name:'일본',          group:'F', confederation:'AFC',      fifa_rank:18, coach:'모리야스 하지메',     titles:0, players:['쿠보 타케후사','엔도 와타루','미토마'],          best_result:'16강 (2002·2010·2018·2022)', desc:'2022 독일·스페인 격파의 기적. 강도 높은 압박과 빠른 전환이 핵심 무기.' },
  { flag:'🇸🇪', name:'스웨덴',        group:'F', confederation:'UEFA',     fifa_rank:25, coach:'욘 달렌',             titles:0, players:['알렉산데르 이사크','쿨루세프스키'],              best_result:'준우승 (1958)',            desc:'이사크의 결정력과 쿨루세프스키의 창의성을 앞세운 조직적 팀.' },
  { flag:'🇩🇪', name:'독일',          group:'G', confederation:'UEFA',     fifa_rank:15, coach:'율리안 나겔스만',     titles:4, players:['야말라 무시알라','플로리안 비르츠','뤼디거'],   best_result:'우승 (1954·74·90·2014)',   desc:'4회 우승 강국. 무시알라·비르츠 황금 콤비의 세대 교체 완료. 조직력과 개인기의 균형.' },
  { flag:'🇮🇹', name:'이탈리아',      group:'G', confederation:'UEFA',     fifa_rank:9,  coach:'루치아노 스팔레티',   titles:4, players:['잔루이지 도나룸마','페데리코 키에사'],          best_result:'우승 (1934·38·82·2006)',  desc:'4회 우승의 전통 강호. 카테나치오의 나라. 도나룸마의 세계 최고 골키퍼 능력.' },
  { flag:'🇧🇪', name:'벨기에',        group:'G', confederation:'UEFA',     fifa_rank:3,  coach:'도미니크 빌뮤트',     titles:0, players:['케빈 데브루이너','로멜루 루카쿠','쿠르투아'],   best_result:'3위 (2018)',               desc:'황금세대 마지막 불꽃. 데브루이너의 창의성과 루카쿠의 압도적 피지컬.' },
  { flag:'🇨🇮', name:'코트디부아르',  group:'G', confederation:'CAF',      fifa_rank:48, coach:'에머스 파에',         titles:0, players:['세바스티앙 알레르','프랑크 케시에'],            best_result:'조별리그',                desc:'아프리카 네이션스컵 3회 우승 강호. 강인한 피지컬과 개인기.' },
  { flag:'🇪🇬', name:'이집트',        group:'H', confederation:'CAF',      fifa_rank:34, coach:'헤삼 엘바드리',       titles:0, players:['모하메드 살라','무스타파 모하메드'],            best_result:'조별리그',                desc:'살라라는 세계적 슈퍼스타를 보유. 살라의 개인 능력 하나만으로도 어떤 팀도 위협.' },
  { flag:'🇸🇦', name:'사우디아라비아',group:'H', confederation:'AFC',      fifa_rank:56, coach:'에르베 르나르',       titles:0, players:['살렘 알 도사리','사미 알 나자이'],              best_result:'16강 (1994)',              desc:'2022 카타르에서 아르헨티나를 꺾은 이변의 주인공. 강도 높은 오프사이드 트랩.' },
  { flag:'🇮🇷', name:'이란',          group:'I', confederation:'AFC',      fifa_rank:22, coach:'아미르 갈레노이',     titles:0, players:['메흐디 타레미','사르다르 아즈문'],              best_result:'조별리그',                desc:'아시아 최다 월드컵 본선 진출국 중 하나. 타레미의 결정력이 핵심.' },
  { flag:'🇦🇺', name:'호주',          group:'I', confederation:'AFC',      fifa_rank:24, coach:'토니 포포비치',       titles:0, players:['매튜 레키','해리 수타','미첼 듀크'],            best_result:'16강 (2006·2022)',         desc:'2022 카타르 16강 신화 재현 도전. 강도 높은 압박과 세트피스 강점.' },
  { flag:'🇳🇬', name:'나이지리아',    group:'I', confederation:'CAF',      fifa_rank:28, coach:'핀디 레시',           titles:0, players:['빅터 오시멘','아데모라 루쿠만','이워비'],       best_result:'16강 (1994·1998·2014)',    desc:'슈퍼 이글스. 오시멘의 폭발적인 스트라이킹이 최대 무기.' },
  { flag:'🇨🇭', name:'스위스',        group:'J', confederation:'UEFA',     fifa_rank:21, coach:'무라트 야킨',         titles:0, players:['그라니트 자카','샤키리 크세르단'],              best_result:'8강 (1934·1938·1954)',    desc:'유럽의 복병. 자카의 중원 장악과 조직적 수비로 매 대회 다크호스.' },
  { flag:'🇨🇴', name:'콜롬비아',      group:'J', confederation:'CONMEBOL', fifa_rank:12, coach:'네스토르 로렌소',     titles:0, players:['루이스 디아스','하메스 로드리게스'],            best_result:'8강 (2014)',               desc:'2024 코파 아메리카 준우승. 디아스의 측면 돌파와 하메스의 창의성.' },
  { flag:'🇪🇨', name:'에콰도르',      group:'J', confederation:'CONMEBOL', fifa_rank:37, coach:'세바스티안 보치니',   titles:0, players:['에네르 발렌시아','카이세도'],                  best_result:'16강 (2006)',              desc:'남미의 신흥 강자. 카이세도의 중원 지배와 발렌시아의 결정력.' },
  { flag:'🇬🇭', name:'가나',          group:'J', confederation:'CAF',      fifa_rank:53, coach:'오토 아도',           titles:0, players:['모하메드 쿠다스','토마스 파르티'],              best_result:'8강 (2010)',               desc:'블랙 스타스. 아프리카 월드컵 4강(2010)의 주역. 강렬한 에너지와 개인기.' },
  { flag:'🇹🇷', name:'터키',          group:'K', confederation:'UEFA',     fifa_rank:30, coach:'빈센조 몬텔라',       titles:0, players:['아르다 귈러','하칸 찰하노을루'],               best_result:'3위 (2002)',               desc:'2002년 3위 전통. 귈러의 천재적 드리블이 새 에이스로 부상.' },
  { flag:'🇩🇰', name:'덴마크',        group:'K', confederation:'UEFA',     fifa_rank:11, coach:'카스페르 흘만트',     titles:0, players:['크리스티안 에릭센','호이베르그','크리스텐센'],   best_result:'우승 (유로 1992)',         desc:'유로 1992 깜짝 우승. 에릭센의 경이로운 부활 스토리. 조직력이 뛰어난 팀.' },
  { flag:'🇧🇴', name:'볼리비아',      group:'K', confederation:'CONMEBOL', fifa_rank:85, coach:'오스카르 빌레가스',   titles:0, players:['마르코스 테나','후안 카를로스 아르세'],        best_result:'조별리그',                desc:'고지대 홈 이점이 강점. 국제 무대에서는 약팀이지만 조별리그 교란자 역할.' },
  { flag:'🇷🇸', name:'세르비아',      group:'L', confederation:'UEFA',     fifa_rank:33, coach:'드라간 스토이코비치', titles:0, players:['두샨 블라호비치','두샨 타디치','미트로비치'],   best_result:'3위 (유고, 1930·62)',      desc:'발칸의 다크호스. 블라호비치와 미트로비치 두 세계적 스트라이커 보유.' },
  { flag:'🇵🇱', name:'폴란드',        group:'L', confederation:'UEFA',     fifa_rank:26, coach:'미하우 프로비에즈',   titles:0, players:['로베르트 레반도프스키','지엘린스키'],          best_result:'3위 (1974·1982)',          desc:'레반도프스키라는 세계 최고의 골잡이 보유. 그의 결정력만으로도 충분한 위협.' },
  { flag:'🇶🇦', name:'카타르',        group:'L', confederation:'AFC',      fifa_rank:58, coach:'마르코스 마테우스',   titles:0, players:['악람 아피프','알모에즈 알리'],                best_result:'조별리그 (2022)',          desc:'2022 자국 월드컵 개최국. 아피프의 드리블과 알리의 결정력.' },
  { flag:'🇩🇿', name:'알제리',        group:'L', confederation:'CAF',      fifa_rank:42, coach:'다지멜 벨하조',       titles:0, players:['리야드 마레즈','이스마일 베나세르'],            best_result:'16강 (2014)',              desc:'아프리카 네이션스컵 2019 챔피언. 마레즈의 측면 드리블이 핵심.' },
  { flag:'🇨🇷', name:'코스타리카',    group:'F', confederation:'CONCACAF', fifa_rank:51, coach:'구스타보 알파로',     titles:0, players:['켈로르 나바스','조엘 캠벨'],                  best_result:'8강 (2014)',               desc:'2014 브라질 8강 신화. 나바스의 세계 최고 수준 골키퍼 능력.' },
  { flag:'🇦🇹', name:'오스트리아',    group:'H', confederation:'UEFA',     fifa_rank:27, coach:'라너 라너',           titles:0, players:['다비드 알라바','마르코 아른아우토비치'],        best_result:'3위 (1954)',               desc:'알라바의 멀티 포지션 능력과 아른아우토비치의 결정력이 핵심.' },
  { flag:'🇵🇪', name:'페루',          group:'H', confederation:'CONMEBOL', fifa_rank:39, coach:'호르헤 포사다',       titles:0, players:['파올로 게레로','크리스티안 쿠에바'],            best_result:'준우승 (1975 코파)',        desc:'남미의 다크호스. 게레로의 경험과 쿠에바의 창의성이 강점.' },
  { flag:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', name:'웨일스',      group:'I', confederation:'UEFA',     fifa_rank:29, coach:'크레이그 벨라미',     titles:0, players:['가레스 베일','아론 램지'],                    best_result:'8강 (1958)',               desc:'베일의 후계 세대가 드래곤의 불꽃을 이어받아 첫 우승에 도전.' },
  { flag:'🇭🇳', name:'온두라스',      group:'K', confederation:'CONCACAF', fifa_rank:72, coach:'레이날도 루에다',     titles:0, players:['로마멜 페랄타','앤디 나헤라'],                  best_result:'16강 (2014)',              desc:'중미의 강자. 탄탄한 수비와 빠른 역습으로 이변을 노린다.' },
]

// ── 상세 모달 ─────────────────────────────────────────────────────────────────
function Modal({ team, onClose }) {
  const cc = CONF_COLORS[team.confederation] || { border: '#888', bg: 'rgba(128,128,128,0.1)' }
  const [showMap, setShowMap] = useState(false)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={showMap ? undefined : onClose}
    >
      <div className="wc-card w-full max-w-md p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-xl leading-none"
        >✕</button>

        <div className="flex items-center gap-4 mb-5">
          <FlagImg name={team.name} emoji={team.flag} size={80} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h2 className="font-bebas text-2xl text-white tracking-wide">{team.name}</h2>
              <button
                onClick={() => setShowMap(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              >📍 위치</button>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{ background: cc.bg, color: cc.border, border: `1px solid ${cc.border}44` }}
              >{CONF_KO[team.confederation] || team.confederation}</span>
              <span className="text-sm text-white/60">Group {team.group}</span>
              {team.titles > 0 && (
                <span className="text-xs text-wc-gold">{'🏆'.repeat(Math.min(team.titles, 5))} {team.titles}회 우승</span>
              )}
            </div>
          </div>
        </div>
        {showMap && <CountryMapModal country={team} onClose={() => setShowMap(false)} />}

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="wc-card p-3">
            <div className="text-xs text-white/30 mb-1">FIFA 랭킹</div>
            <div className="font-bold text-wc-gold text-lg">{team.fifa_rank}위</div>
          </div>
          <div className="wc-card p-3">
            <div className="text-xs text-white/30 mb-1">최고 성적</div>
            <div className="font-semibold text-white text-sm leading-tight">{team.best_result}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-white/30 mb-2">주요 선수</div>
          <div className="flex flex-wrap gap-2">
            {team.players.map(p => (
              <span
                key={p}
                className="text-sm px-3 py-1 rounded-full font-medium"
                style={{ background: 'rgba(200,168,75,0.1)', border: '1px solid rgba(200,168,75,0.22)', color: '#C8A84B' }}
              >⭐ {p}</span>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-white/30 mb-1">감독</div>
          <div className="text-sm text-white/70">🧑‍💼 {team.coach}</div>
        </div>

        <p className="text-sm text-white/50 leading-relaxed border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          {team.desc}
        </p>
      </div>
    </div>
  )
}

// ── 캐러셀 ────────────────────────────────────────────────────────────────────
const SLOTS = [-2, -1, 0, 1, 2]
const CARD_OP = { 0: 1, 1: 0.80, 2: 0.48 }

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

function CountryCarousel({ teams, onSelect }) {
  const N = teams.length
  const [cur, setCur] = useState(0)
  const [animDir, setAnimDir] = useState(null)
  const touchX = useRef(null)
  const ww = useWindowWidth()
  const sm = ww < 640

  // 카드 크기
  const W = sm ? { 0: 144, 1: 108, 2: 78 } : { 0: 196, 1: 150, 2: 108 }
  const H = sm ? { 0: 178, 1: 138, 2: 102 } : { 0: 236, 1: 185, 2: 138 }
  const G01 = sm ? 10 : 14   // center↔side gap
  const G12 = sm ? 8  : 10   // side↔far gap
  const stageH = H[0] + 44

  // 팀 목록이 바뀌면 인덱스 리셋
  useEffect(() => { setCur(0); setAnimDir(null) }, [teams])

  const navigate = useCallback((dir) => {
    if (animDir !== null || N < 2) return
    setAnimDir(dir)
    setTimeout(() => {
      setCur(c => ((c + dir) % N + N) % N)
      setAnimDir(null)
    }, 430)
  }, [animDir, N])

  // 키보드 지원
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'ArrowLeft')  navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [navigate])

  if (N === 0) return (
    <div className="text-center py-20 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
      검색 결과가 없습니다
    </div>
  )

  const teamAt = offset => teams[((cur + offset) % N + N) % N]
  const centerTeam = teamAt(0)
  const cc = CONF_COLORS[centerTeam.confederation] || { border: '#888', bg: 'rgba(128,128,128,0.1)' }

  // 슬롯 X 좌표 계산
  const slotX = (offset) => {
    const abs = Math.abs(offset), sign = offset > 0 ? 1 : -1
    if (abs === 0) return 0
    let x = W[0] / 2 + W[1] / 2 + G01
    if (abs === 2) x += W[1] / 2 + W[2] / 2 + G12
    return sign * x
  }

  // 슬롯별 스타일
  const getSlotStyle = (slot) => {
    const vis   = animDir !== null ? slot - animDir : slot
    const shown = Math.abs(vis) <= 2
    const a     = Math.min(Math.abs(vis), 2)
    const w = W[a], h = H[a]
    const x = shown ? slotX(vis) : (vis > 0 ? slotX(2) + W[2] + 20 : slotX(-2) - W[2] - 20)
    return {
      position: 'absolute',
      width: w, height: h,
      left:    `calc(50% + ${x}px - ${w / 2}px)`,
      top:     `calc(50% - ${h / 2}px)`,
      opacity: shown ? CARD_OP[a] : 0,
      zIndex:  shown ? 10 - Math.abs(vis) * 3 : 0,
      borderRadius: 12,
      overflow: 'hidden',
      cursor: slot !== 0 ? 'pointer' : 'default',
      transition: animDir !== null
        ? 'left 0.42s cubic-bezier(0.4,0,0.2,1), top 0.42s cubic-bezier(0.4,0,0.2,1), width 0.42s cubic-bezier(0.4,0,0.2,1), height 0.42s cubic-bezier(0.4,0,0.2,1), opacity 0.42s ease'
        : 'none',
      // 중앙→측면→끝 순으로 배경 점진 변화
      background: a === 0
        ? 'rgba(255,255,255,0.055)'
        : a === 1 ? 'rgba(255,255,255,0.032)' : 'rgba(255,255,255,0.018)',
      border: `1px solid ${a === 0 ? 'rgba(200,168,75,0.22)' : 'rgba(255,255,255,0.07)'}`,
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    }
  }

  const navBtn = (side) => ({
    position: 'absolute',
    top: '50%', transform: 'translateY(-50%)',
    [side]: sm ? 4 : 10,
    width: 30, height: 30, borderRadius: '50%',
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: 'rgba(255,255,255,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 16, zIndex: 20, userSelect: 'none',
    transition: 'background 0.15s',
  })

  return (
    <div>
      {/* ── 스테이지 ── */}
      <div
        className="relative"
        style={{ height: stageH }}
        onTouchStart={e => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1)
        }}
      >
        <button style={navBtn('left')}  onClick={() => navigate(-1)} aria-label="이전">‹</button>
        <button style={navBtn('right')} onClick={() => navigate(1)}  aria-label="다음">›</button>

        {SLOTS.map(slot => {
          const team    = teamAt(slot)
          const visOff  = animDir !== null ? slot - animDir : slot
          const absVis  = Math.min(Math.abs(visOff), 2)
          const isCenter = slot === 0
          const flagSz  = absVis === 0 ? (sm ? 52 : 64) : absVis === 1 ? (sm ? 36 : 44) : (sm ? 26 : 32)
          const nameSz  = absVis === 0 ? (sm ? 14 : 16) : absVis === 1 ? (sm ? 12 : 13) : (sm ? 10 : 11)
          const tcc     = CONF_COLORS[team.confederation] || { border: '#888', bg: 'rgba(128,128,128,0.1)' }

          return (
            <div
              key={slot}
              style={getSlotStyle(slot)}
              onClick={!isCenter ? () => navigate(slot > 0 ? 1 : -1) : () => onSelect(team)}
            >
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 select-none">
                {/* 국기 */}
                <FlagImg name={team.name} emoji={team.flag} size={flagSz} />

                {/* 국가명 */}
                <div
                  className="font-semibold text-center leading-tight"
                  style={{ fontSize: nameSz, color: '#e8e8ee' }}
                >
                  {team.name}
                </div>

                {/* Group 표시 (±1 이내) */}
                {absVis <= 1 && (
                  <div style={{ fontSize: absVis === 0 ? 11 : 10, color: 'rgba(200,168,75,0.9)' }}>
                    Group {team.group}
                  </div>
                )}

                {/* 중앙 카드 전용 배지 */}
                {absVis === 0 && (
                  <>
                    <div className="flex gap-1 flex-wrap justify-center mt-0.5">
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: tcc.bg, color: tcc.border, border: `1px solid ${tcc.border}44` }}
                      >{CONF_KO[team.confederation] || team.confederation}</span>
                      <FifaBadge name={team.name} />
                    </div>
                    {team.titles > 0 && (
                      <div style={{ fontSize: 11, color: '#C8A84B', letterSpacing: 1 }}>
                        {'🏆'.repeat(Math.min(team.titles, 5))}
                      </div>
                    )}
                    <div
                      className="mt-1 text-[10px] px-3 py-0.5 rounded-full"
                      style={{ background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.28)', color: 'rgba(200,168,75,0.9)' }}
                    >자세히 보기</div>
                  </>
                )}

                {/* 측면 카드 FIFA 랭킹 */}
                {absVis === 1 && (
                  <FifaBadge name={team.name} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 위치 표시 + 프로그레스 바 ── */}
      <div className="flex flex-col items-center gap-2 mt-3 mb-5">
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{cur + 1}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}> / {N}</span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ width: 100, height: 2, background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${(cur + 1) / N * 100}%`, background: 'rgba(200,168,75,0.6)', transition: 'width 0.3s ease' }}
          />
        </div>
      </div>

      {/* ── 인포 바 ── */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start gap-3">
          {/* 국기 */}
          <div className="flex-shrink-0 mt-0.5">
            <FlagImg name={centerTeam.name} emoji={centerTeam.flag} size={sm ? 40 : 52} />
          </div>

          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bebas text-lg text-white tracking-wide">{centerTeam.name}</span>
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ background: cc.bg, color: cc.border, border: `1px solid ${cc.border}44` }}
              >{CONF_KO[centerTeam.confederation] || centerTeam.confederation}</span>
              <span style={{ fontSize: 11, color: 'rgba(200,168,75,0.85)' }}>Group {centerTeam.group}</span>
              {centerTeam.titles > 0 && (
                <span className="text-xs text-wc-gold">{centerTeam.titles}회 우승 🏆</span>
              )}
            </div>

            <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {centerTeam.desc}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {centerTeam.players.map(p => (
                <span
                  key={p}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(200,168,75,0.10)', border: '1px solid rgba(200,168,75,0.22)', color: '#C8A84B' }}
                >⭐ {p}</span>
              ))}
            </div>
          </div>

          {/* 자세히 버튼 */}
          <button
            onClick={() => onSelect(centerTeam)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
            style={{ background: 'rgba(200,168,75,0.15)', border: '1px solid rgba(200,168,75,0.35)', color: '#C8A84B' }}
          >자세히</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function CountriesPage() {
  const [selected,   setSelected]   = useState(null)
  const [confFilter, setConfFilter] = useState('전체')
  const [sortBy,     setSortBy]     = useState('group')

  const filtered = TEAMS
    .filter(t => confFilter === '전체' || t.confederation === confFilter)
    .sort((a, b) => sortBy === 'rank' ? a.fifa_rank - b.fifa_rank : 0)

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="font-bebas font-black text-4xl md:text-5xl text-wc-gold tracking-widest mb-1">
            참가국 소개
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            48개국 · ‹ › 버튼 또는 키보드 ←→ 로 탐색 · 카드 클릭으로 상세 정보
          </p>
        </div>

        {/* 필터 + 정렬 */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          {/* 대륙 선택 */}
          <div className="relative">
            <select
              value={confFilter}
              onChange={e => setConfFilter(e.target.value)}
              className="appearance-none text-sm pl-4 pr-9 py-2.5 rounded-xl outline-none cursor-pointer font-medium"
              style={{
                background: confFilter === '전체' ? 'rgba(255,255,255,0.06)' : 'rgba(200,168,75,0.12)',
                border: `1px solid ${confFilter === '전체' ? 'rgba(255,255,255,0.13)' : 'rgba(200,168,75,0.4)'}`,
                color: confFilter === '전체' ? 'rgba(255,255,255,0.6)' : '#C8A84B',
                minWidth: 190,
              }}
            >
              {CONFEDERATIONS.map(c => (
                <option key={c} value={c} style={{ background: '#0c1220', color: '#e8e8ee' }}>
                  {CONF_KO[c]} ({c === '전체' ? TEAMS.length : TEAMS.filter(t => t.confederation === c).length})
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
              style={{ color: confFilter === '전체' ? 'rgba(255,255,255,0.35)' : 'rgba(200,168,75,0.7)' }}>▼</span>
          </div>

          {/* 구분선 */}
          <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.1)' }} />

          {/* 정렬 */}
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            {[{ v: 'group', l: '조별순', icon: '📋' }, { v: 'rank', l: '랭킹순', icon: '🏆' }].map(({ v, l, icon }) => (
              <button
                key={v}
                onClick={() => setSortBy(v)}
                className="px-3.5 py-2.5 text-xs font-semibold transition-all"
                style={
                  sortBy === v
                    ? { background: 'rgba(200,168,75,0.18)', color: '#C8A84B', borderRight: v === 'group' ? '1px solid rgba(255,255,255,0.1)' : 'none' }
                    : { background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.38)', borderRight: v === 'group' ? '1px solid rgba(255,255,255,0.1)' : 'none' }
                }
              >
                <span className="mr-1">{icon}</span>{l}
              </button>
            ))}
          </div>
        </div>

        {/* 캐러셀 */}
        <CountryCarousel teams={filtered} onSelect={setSelected} />
      </div>

      {selected && <Modal team={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
