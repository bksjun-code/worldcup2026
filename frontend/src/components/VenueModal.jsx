import { useState, useEffect, useRef, useCallback } from 'react'

const VENUES = {
  'Estadio Akron':          { ko: '에스타디오 아크론',      city: '과달라하라, 멕시코',        capacity: 49850, wttr: 'Guadalajara',     wiki: 'Estadio_Akron' },
  'Estadio BBVA':           { ko: '에스타디오 BBVA',        city: '몬테레이, 멕시코',          capacity: 53500, wttr: 'Monterrey',       wiki: 'Estadio_BBVA' },
  'Estadio Jalisco':        { ko: '에스타디오 할리스코',    city: '과달라하라, 멕시코',        capacity: 55039, wttr: 'Guadalajara',     wiki: 'Estadio_Jalisco' },
  'Estadio Azteca':         { ko: '에스타디오 아스테카',    city: '멕시코시티, 멕시코',        capacity: 87523, wttr: 'Mexico City',     wiki: 'Estadio_Azteca' },
  'SoFi Stadium':           { ko: '소파이 스타디움',        city: '인글우드, CA, 미국',        capacity: 70240, wttr: 'Inglewood',       wiki: 'SoFi_Stadium' },
  'Rose Bowl':              { ko: '로즈볼',                  city: '패서디나, CA, 미국',        capacity: 92542, wttr: 'Pasadena',        wiki: 'Rose_Bowl_stadium' },
  "Levi's Stadium":         { ko: '리바이스 스타디움',      city: '산타클라라, CA, 미국',      capacity: 68500, wttr: 'Santa+Clara',     wiki: "Levi%27s_Stadium" },
  'AT&T Stadium':           { ko: 'AT&T 스타디움',          city: '알링턴, TX, 미국',          capacity: 80000, wttr: 'Arlington,Texas', wiki: 'AT%26T_Stadium' },
  'NRG Stadium':            { ko: 'NRG 스타디움',           city: '휴스턴, TX, 미국',          capacity: 72220, wttr: 'Houston',         wiki: 'NRG_Stadium' },
  'Arrowhead Stadium':      { ko: '애로헤드 스타디움',      city: '캔자스시티, MO, 미국',      capacity: 76416, wttr: 'Kansas+City',     wiki: 'GEHA_Field_at_Arrowhead_Stadium' },
  'MetLife Stadium':        { ko: '메트라이프 스타디움',    city: '이스트 러더퍼드, NJ, 미국', capacity: 82500, wttr: 'East+Rutherford',  wiki: 'MetLife_Stadium' },
  'Lincoln Financial Field':{ ko: '링컨 파이낸셜 필드',    city: '필라델피아, PA, 미국',      capacity: 69796, wttr: 'Philadelphia',    wiki: 'Lincoln_Financial_Field' },
  'Gillette Stadium':       { ko: '질렛 스타디움',          city: '폭스버러, MA, 미국',        capacity: 65878, wttr: 'Foxborough',      wiki: 'Gillette_Stadium' },
  'Hard Rock Stadium':      { ko: '하드록 스타디움',        city: '마이애미 가든스, FL, 미국', capacity: 65326, wttr: 'Miami+Gardens',    wiki: 'Hard_Rock_Stadium' },
  'Lumen Field':            { ko: '루멘 필드',              city: '시애틀, WA, 미국',          capacity: 72000, wttr: 'Seattle',         wiki: 'Lumen_Field' },
  'Allegiant Stadium':      { ko: '얼리전트 스타디움',      city: '라스베이거스, NV, 미국',    capacity: 65000, wttr: 'Las+Vegas',       wiki: 'Allegiant_Stadium' },
  'BC Place':               { ko: 'BC 플레이스',            city: '밴쿠버, 캐나다',            capacity: 54500, wttr: 'Vancouver',       wiki: 'BC_Place' },
  'BMO Field':              { ko: 'BMO 필드',               city: '토론토, 캐나다',            capacity: 45736, wttr: 'Toronto',         wiki: 'BMO_Field' },
}

export function getVenueNameKo(englishName) {
  return VENUES[englishName]?.ko || englishName
}

function weatherIcon(code) {
  const c = Number(code)
  if (c === 113) return '☀️'
  if ([116, 119, 122].includes(c)) return '⛅'
  if ([143, 248, 260].includes(c)) return '🌫️'
  if ([176, 185, 263, 266, 293, 296, 299, 302, 305, 308, 353].includes(c)) return '🌧️'
  if ([200, 386, 389, 392, 395].includes(c)) return '⛈️'
  if ([179, 182, 227, 230, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(c)) return '🌨️'
  return '🌤️'
}

export default function VenueModal({ venue, onClose }) {
  const [pos, setPos] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [weather, setWeather] = useState(null)
  const [img, setImg] = useState(null)
  const [imgLoading, setImgLoading] = useState(true)
  const dragOffset = useRef({ x: 0, y: 0 })

  const info = VENUES[venue] || {}

  // 초기 중앙 위치
  useEffect(() => {
    setPos({
      x: Math.max(20, (window.innerWidth - 460) / 2),
      y: Math.max(80, (window.innerHeight - 520) / 2),
    })
  }, [])

  // 날씨 fetch
  useEffect(() => {
    if (!info.wttr) return
    fetch(`https://wttr.in/${info.wttr}?format=j1`)
      .then(r => r.json())
      .then(d => setWeather(d.current_condition?.[0]))
      .catch(() => {})
  }, [info.wttr])

  // Wikipedia 이미지 fetch
  useEffect(() => {
    if (!info.wiki) return
    setImgLoading(true)
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${info.wiki}`)
      .then(r => r.json())
      .then(d => {
        const src = d.thumbnail?.source
        if (src) setImg(src.replace(/\/\d+px-/, '/600px-'))
        else setImg(null)
      })
      .catch(() => setImg(null))
      .finally(() => setImgLoading(false))
  }, [info.wiki])

  // 드래그
  const onMouseDown = (e) => {
    setDragging(true)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }
  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [dragging])
  const onMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  // Esc 닫기
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!pos) return null

  return (
    <div
      className="fixed z-[100] w-[460px] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        left: pos.x, top: pos.y,
        background: 'rgba(10,14,26,0.97)',
        backdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        userSelect: dragging ? 'none' : 'auto',
      }}
    >
      {/* 드래그 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-move"
        style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onMouseDown={onMouseDown}
      >
        <div>
          <div className="font-bold text-white text-sm">🏟️ {info.ko || venue}</div>
          <div className="text-xs text-gray-400 mt-0.5">{info.city || '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 select-none">드래그로 이동</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 경기장 이미지 */}
      <div className="relative w-full h-44 bg-gray-900/60 overflow-hidden">
        {imgLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
            이미지 로딩 중...
          </div>
        )}
        {img && (
          <img
            src={img}
            alt={venue}
            className="w-full h-full object-cover"
            onError={() => setImg(null)}
          />
        )}
        {!imgLoading && !img && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">🏟️</div>
        )}
        {/* 수용인원 오버레이 */}
        {info.capacity && (
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
            👥 {info.capacity.toLocaleString()}명
          </div>
        )}
      </div>

      {/* 정보 카드 */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* 현재 날씨 */}
        <div className="col-span-2 rounded-xl p-3 flex items-center gap-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {weather ? (
            <>
              <span className="text-4xl">{weatherIcon(weather.weatherCode)}</span>
              <div>
                <div className="text-xl font-bold text-white">{weather.temp_C}°C</div>
                <div className="text-xs text-gray-400">{weather.weatherDesc?.[0]?.value}</div>
              </div>
              <div className="ml-auto text-right text-xs text-gray-500 space-y-1">
                <div>💧 습도 {weather.humidity}%</div>
                <div>💨 {weather.windspeedKmph} km/h {weather.winddir16Point}</div>
                <div>👁️ 체감 {weather.FeelsLikeC}°C</div>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-500">날씨 정보 로딩 중...</span>
          )}
        </div>

        {/* 위치 */}
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] text-gray-500 mb-1">📍 위치</div>
          <div className="text-xs text-gray-300 leading-relaxed">{info.city}</div>
        </div>

        {/* 수용인원 */}
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[10px] text-gray-500 mb-1">👥 수용인원</div>
          <div className="text-sm font-bold text-wc-gold">{info.capacity?.toLocaleString()}명</div>
        </div>
      </div>
    </div>
  )
}
