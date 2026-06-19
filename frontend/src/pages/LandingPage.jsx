import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import api from '../api'

import bg1 from '../photo/1.png'
import bg2 from '../photo/2.png'
import bg3 from '../photo/3.png'
import bg4 from '../photo/4.png'
import bg5 from '../photo/5.png'
import bg6 from '../photo/6.png'
import bg7 from '../photo/7.png'

const BG_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6, bg7]

const TEAM_FLAG = {
  '대한민국': '🇰🇷', '체코': '🇨🇿', '멕시코': '🇲🇽', '남아프리카공화국': '🇿🇦',
  '남아공': '🇿🇦', '미국': '🇺🇸', '캐나다': '🇨🇦',
}

function useKoreaNextMatch() {
  const [nextMatch, setNextMatch] = useState(undefined) // undefined=로딩중, null=없음
  useEffect(() => {
    api.get('/matches')
      .then(r => {
        const now = Date.now()
        const korea = r.data
          .filter(m => m.home_team === '대한민국' || m.away_team === '대한민국')
          .sort((a, b) => new Date(a.match_date + '+09:00') - new Date(b.match_date + '+09:00'))
        const live = korea.find(m => m.status === 'live')
        if (live) { setNextMatch({ ...live, isLive: true }); return }
        const next = korea.find(m => m.status !== 'finished' && new Date(m.match_date + '+09:00') > now)
        setNextMatch(next ? { ...next, isLive: false } : null)
      })
      .catch(() => setNextMatch(null))
  }, [])
  return nextMatch
}

function useCountdown(target) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    if (!target) return
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setTime({
        days:    Math.floor(diff / 86400000),
        hours:   Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return time
}

/* ── 카운트다운 유닛 ────────────────────────── */
function CountdownUnit({ value, label }) {
  const ref  = useRef(null)
  const prev = useRef(value)
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      gsap.fromTo(ref.current,
        { y: -14, opacity: 0 },
        { y: 0,   opacity: 1, duration: 0.28, ease: 'back.out(1.5)' }
      )
    }
    prev.current = value
  }, [value])

  return (
    <div className="flex flex-col items-center">
      <div
        className="rounded-2xl px-4 py-3 md:px-6 md:py-4 min-w-[72px] md:min-w-[110px] text-center"
        style={{
          background: 'rgba(7,9,15,0.75)',
          border: '1px solid rgba(200,168,75,0.45)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 24px rgba(200,168,75,0.15), inset 0 1px 0 rgba(200,168,75,0.1)',
        }}
      >
        <div
          ref={ref}
          className="font-bebas font-black text-5xl md:text-7xl tabular-nums"
          style={{ color: '#C8A84B', textShadow: '0 0 20px rgba(200,168,75,0.8), 0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {String(value).padStart(2, '0')}
        </div>
      </div>
      <div className="text-white text-[11px] md:text-xs tracking-[0.25em] mt-2 uppercase font-semibold"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
        {label}
      </div>
    </div>
  )
}

/* ── 배경 슬라이드쇼 훅 ─────────────────────── */
function useBgSlideshow(images, interval = 2000) {
  const [cur, setCur]  = useState(0)   // 현재 보이는 인덱스
  const [prev, setPrev] = useState(null) // 페이드아웃 중인 인덱스
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setCur(c => {
        const next = (c + 1) % images.length
        setPrev(c)
        setFading(true)
        // 애니메이션 끝나면 prev 제거
        setTimeout(() => {
          setPrev(null)
          setFading(false)
        }, 2700)
        return next
      })
    }, interval)
    return () => clearInterval(id)
  }, [images.length, interval])

  return { cur, prev, fading }
}

/* ── 배경 레이어 ─────────────────────────────── */
function BgSlideshow() {
  const { cur, prev } = useBgSlideshow(BG_IMAGES, 2000)

  const imgStyle = { filter: 'blur(1px)', transform: 'scale(1.04)' }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* 다음(현재) 이미지 — 아래에 깔려 드러남 */}
      <img
        key={`cur-${cur}`}
        src={BG_IMAGES[cur]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={imgStyle}
      />

      {/* 이전 이미지 — 정가운데서 바깥으로 마스크 확장하며 페이드아웃 */}
      {prev !== null && (
        <img
          key={`prev-${prev}`}
          src={BG_IMAGES[prev]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center bg-radial-fade-out"
          style={imgStyle}
        />
      )}

      {/* 어두운 오버레이 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom,
              rgba(7,9,15,0.60) 0%,
              rgba(7,9,15,0.35) 40%,
              rgba(7,9,15,0.60) 75%,
              rgba(7,9,15,0.94) 100%
            ),
            linear-gradient(to right,
              rgba(139,30,47,0.15) 0%,
              transparent 50%,
              rgba(27,61,110,0.12) 100%
            )
          `,
        }}
      />
    </div>
  )
}

/* ── 메인 컴포넌트 ──────────────────────────── */
export default function LandingPage() {
  const heroRef      = useRef(null)
  const titleRef     = useRef(null)
  const subtitleRef  = useRef(null)
  const countdownRef = useRef(null)
  const ctaRef       = useRef(null)
  const audioRef     = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume]   = useState(0.4)
  const nextMatch = useKoreaNextMatch()
  const matchTarget = nextMatch ? new Date(nextMatch.match_date + '+09:00').getTime() : null
  const { days, hours, minutes, seconds } = useCountdown(matchTarget)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(titleRef.current,     { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 })
      .fromTo(subtitleRef.current,  { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')
      .fromTo(countdownRef.current, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8 }, '-=0.4')
      .fromTo(ctaRef.current,       { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.2')
  }, [])

  return (
    <div className="relative min-h-screen flex flex-col" ref={heroRef}>

      {/* ── 배경음악 ── */}
      <audio ref={audioRef} src={`${import.meta.env.BASE_URL}korea.mp4`} loop preload="none" />

      {/* ── 음악 컨트롤 (우하단 고정) ── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        style={{ background: 'rgba(7,9,15,0.85)', border: '1px solid rgba(200,168,75,0.3)', backdropFilter: 'blur(12px)', borderRadius: '999px', padding: '6px 14px 6px 8px' }}>
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ background: playing ? 'rgba(200,168,75,0.25)' : 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.4)' }}
          title={playing ? '음악 정지' : '응원가 재생'}
        >
          {playing
            ? <span style={{ color: '#C8A84B', fontSize: 16 }}>⏸</span>
            : <span style={{ color: '#C8A84B', fontSize: 16 }}>▶</span>}
        </button>
        <div className="flex flex-col" style={{ minWidth: 90 }}>
          <span className="text-[10px] font-semibold" style={{ color: '#C8A84B', letterSpacing: '0.1em' }}>🎵 붉은악마 응원가</span>
          <input
            type="range" min={0} max={1} step={0.01} value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            className="w-full mt-0.5"
            style={{ accentColor: '#C8A84B', height: 3 }}
          />
        </div>
      </div>

      {/* ── 배경 슬라이드쇼 ── */}
      <BgSlideshow />

      {/* ── 히어로 섹션 ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center">

        {/* 태그라인 */}
        <div className="mb-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-wc-gold/25 bg-wc-gold/8 text-wc-gold text-xs tracking-[0.2em] font-semibold uppercase"
          style={{ background: 'rgba(200,168,75,0.08)' }}>
          ⚽ 2026 FIFA WORLD CUP
        </div>

        {/* 메인 타이틀 */}
        <div ref={titleRef}>
          <h1 className="font-bebas font-black text-5xl md:text-8xl text-white tracking-[0.08em] leading-[1.1]">
            대한민국
          </h1>
          <div className="font-bebas font-black text-4xl md:text-6xl text-wc-gold glow-gold tracking-[0.06em] mt-1">
            CANADA · MEXICO · USA
          </div>
        </div>


        {/* 카운트다운 */}
        <div ref={countdownRef} className="mt-12">
          {nextMatch === undefined ? (
            <div className="text-wc-gold/40 text-sm tracking-widest">로딩 중...</div>
          ) : nextMatch === null ? (
            <div className="text-center px-8 py-6 rounded-2xl" style={{ background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.25)' }}>
              <div className="text-wc-gold font-bebas text-3xl md:text-4xl tracking-widest">🇰🇷 조별리그 완료</div>
              <div className="text-white/50 text-sm mt-2">대한민국의 다음 경기를 기다려 주세요</div>
            </div>
          ) : nextMatch.isLive ? (
            <div className="text-center px-8 py-6 rounded-2xl" style={{ background: 'rgba(139,30,47,0.18)', border: '1px solid rgba(200,168,75,0.35)' }}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-xs font-bold tracking-[0.25em] uppercase">Live</span>
              </div>
              <div className="text-white font-bold text-xl md:text-2xl">
                {TEAM_FLAG[nextMatch.home_team] || ''} {nextMatch.home_team} vs {nextMatch.away_team} {TEAM_FLAG[nextMatch.away_team] || ''}
              </div>
              <div className="text-wc-gold/60 text-xs mt-2">{nextMatch.venue}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-white/50 text-xs tracking-[0.25em] uppercase mb-1">다음 한국 경기</div>
                <div className="text-white font-bold text-lg md:text-2xl">
                  {TEAM_FLAG[nextMatch.home_team] || ''} {nextMatch.home_team} vs {nextMatch.away_team} {TEAM_FLAG[nextMatch.away_team] || ''}
                </div>
                <div className="text-wc-gold/60 text-xs mt-1">{nextMatch.venue}</div>
              </div>
              <div className="flex items-center gap-3 md:gap-7">
                <CountdownUnit value={days}    label="일" />
                <span className="font-bebas font-black text-3xl md:text-5xl pb-5" style={{ color: '#C8A84B', textShadow: '0 0 12px rgba(200,168,75,0.6)' }}>:</span>
                <CountdownUnit value={hours}   label="시간" />
                <span className="font-bebas font-black text-3xl md:text-5xl pb-5" style={{ color: '#C8A84B', textShadow: '0 0 12px rgba(200,168,75,0.6)' }}>:</span>
                <CountdownUnit value={minutes} label="분" />
                <span className="font-bebas font-black text-3xl md:text-5xl pb-5" style={{ color: '#C8A84B', textShadow: '0 0 12px rgba(200,168,75,0.6)' }}>:</span>
                <CountdownUnit value={seconds} label="초" />
              </div>
            </div>
          )}
        </div>

        {/* CTA 버튼 */}
        <div ref={ctaRef} className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link to="/schedule" className="btn-gold text-sm px-7 py-3 rounded-xl">
            📅 전체 대진표 보기
          </Link>
          <Link
            to="/betting"
            className="text-sm px-7 py-3 rounded-xl font-semibold transition-all hover:scale-103"
            style={{
              border:  '1px solid rgba(200,168,75,0.35)',
              color:   '#C8A84B',
              background: 'rgba(200,168,75,0.07)',
              backdropFilter: 'blur(12px)',
            }}
          >
            🎯 한국 경기 베팅
          </Link>
        </div>
      </section>

      {/* ── 한국 조 하이라이트 ── */}
      <section className="relative z-10 py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bebas font-black text-2xl md:text-4xl text-center text-wc-gold tracking-widest mb-8">
            🇰🇷 대한민국 · Group A
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { date: '6월 12일 11:00', opponent: '🇨🇿 체코',      venue: '과달라하라' },
              { date: '6월 19일 10:00', opponent: '🇲🇽 멕시코',    venue: '과달라하라' },
              { date: '6월 25일 10:00', opponent: '🇿🇦 남아공',    venue: '몬테레이'   },
            ].map((m, i) => (
              <div key={i} className="wc-card p-5 text-center">
                <div className="text-wc-gold text-xs font-semibold mb-2 tracking-wide">{m.date} KST</div>
                <div className="text-base font-semibold text-white mb-1">🇰🇷 대한민국 vs {m.opponent}</div>
                <div className="text-white/35 text-xs font-light">{m.venue}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link to="/betting" className="text-wc-gold hover:text-wc-gold/70 text-sm font-medium transition-colors">
              → 지금 베팅하러 가기
            </Link>
          </div>
        </div>
      </section>

      {/* ── 통계 배너 ── */}
      <section className="relative z-10 py-10 border-t border-white/5">
        <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-4 text-center">
          {[
            { value: '48', label: '참가팀' },
            { value: '104', label: '총 경기' },
            { value: '16', label: '개최 도시' },
            { value: '3',  label: '개최국' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-bebas font-black text-4xl md:text-5xl text-wc-gold">{s.value}</div>
              <div className="text-white/35 text-xs tracking-wider font-light mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
