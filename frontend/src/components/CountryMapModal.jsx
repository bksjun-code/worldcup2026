import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

const COORDS = {
  '대한민국': [36.5, 127.5, 5], '체코': [49.8, 15.5, 5], '멕시코': [23.6, -102.6, 4],
  '남아공': [-30.6, 22.9, 4], '미국': [37.1, -95.7, 3], '캐나다': [60.0, -96.0, 3],
  '우루과이': [-32.5, -55.8, 5], '파나마': [8.5, -80.8, 6], '스페인': [40.5, -3.7, 5],
  '모로코': [31.8, -7.1, 5], '포르투갈': [39.4, -8.2, 5], '카메룬': [3.9, 11.5, 5],
  '브라질': [-14.2, -51.9, 3], '크로아티아': [45.1, 15.2, 5], '아르헨티나': [-38.4, -63.6, 3],
  '칠레': [-35.7, -71.5, 4], '프랑스': [46.2, 2.2, 5], '잉글랜드': [52.4, -1.5, 5],
  '세네갈': [14.5, -14.5, 5], '튀니지': [33.9, 9.5, 5], '네덜란드': [52.1, 5.3, 6],
  '일본': [36.2, 138.3, 5], '스웨덴': [60.1, 18.6, 4], '독일': [51.2, 10.5, 5],
  '이탈리아': [41.9, 12.6, 5], '벨기에': [50.5, 4.5, 6], '코트디부아르': [7.5, -5.6, 5],
  '이집트': [26.8, 30.8, 5], '사우디아라비아': [23.9, 45.1, 4], '이란': [32.4, 53.7, 4],
  '호주': [-25.3, 133.8, 3], '나이지리아': [9.1, 8.7, 5], '스위스': [46.8, 8.2, 6],
  '콜롬비아': [4.6, -74.1, 5], '에콰도르': [-1.8, -78.2, 5], '가나': [7.9, -1.0, 6],
  '터키': [38.9, 35.2, 5], '덴마크': [56.3, 9.5, 5], '볼리비아': [-16.3, -63.6, 5],
  '세르비아': [44.0, 21.0, 6], '카타르': [25.4, 51.2, 7], '폴란드': [51.9, 19.1, 5],
  '알제리': [28.0, 2.6, 4], '코스타리카': [9.7, -83.8, 6], '오스트리아': [47.5, 14.6, 6],
  '페루': [-9.2, -75.0, 4], '웨일스': [52.1, -3.8, 6], '온두라스': [15.2, -86.2, 6],
}

const MIN_W = 320, MIN_H = 280, MAX_W = 900, MAX_H = 750

export default function CountryMapModal({ country, onClose }) {
  const [pos, setPos]   = useState(null)
  const [size, setSize] = useState({ w: MAX_W, h: MAX_H })
  const [action, setAction] = useState(null) // null | 'drag' | 'resize-se' | 'resize-e' | 'resize-s'
  const startRef = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 })
  const mapRef  = useRef(null)
  const mapInstance = useRef(null)

  const [lat, lon, zoom] = COORDS[country.name] || [20, 0, 2]

  // 초기 위치
  useEffect(() => {
    setPos({
      x: Math.max(0, (window.innerWidth  - MAX_W) / 2),
      y: Math.max(0, (window.innerHeight - MAX_H) / 2),
    })
  }, [])

  // Leaflet 초기화
  useEffect(() => {
    if (!pos || !mapRef.current || mapInstance.current) return
    import('leaflet').then((Lm) => {
      const L = Lm.default
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      const map = L.map(mapRef.current, { center: [lat, lon], zoom, zoomControl: false, attributionControl: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
      L.marker([lat, lon]).addTo(map).bindPopup(`<b>${country.name}</b>`).openPopup()
      mapInstance.current = map
    })
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null } }
  }, [pos])

  // 드래그 / 리사이즈 시작
  const onDragStart = (e) => {
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h }
    setAction('drag')
    e.preventDefault()
  }
  const onResizeStart = (dir) => (e) => {
    startRef.current = { mx: e.clientX, my: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h }
    setAction(dir)
    e.preventDefault()
    e.stopPropagation()
  }

  // 마우스 이동
  const onMouseMove = useCallback((e) => {
    if (!action) return
    const dx = e.clientX - startRef.current.mx
    const dy = e.clientY - startRef.current.my
    if (action === 'drag') {
      setPos({ x: startRef.current.x + dx, y: startRef.current.y + dy })
    } else {
      let newW = size.w, newH = size.h, newX = pos.x, newY = pos.y
      if (action.includes('e'))  newW = Math.min(MAX_W, Math.max(MIN_W, startRef.current.w + dx))
      if (action.includes('s'))  newH = Math.min(MAX_H, Math.max(MIN_H, startRef.current.h + dy))
      if (action.includes('w')) { newW = Math.min(MAX_W, Math.max(MIN_W, startRef.current.w - dx)); newX = startRef.current.x + (startRef.current.w - newW) }
      if (action.includes('n')) { newH = Math.min(MAX_H, Math.max(MIN_H, startRef.current.h - dy)); newY = startRef.current.y + (startRef.current.h - newH) }
      setSize({ w: newW, h: newH })
      if (action.includes('w') || action.includes('n')) setPos({ x: newX, y: newY })
    }
  }, [action, size, pos])

  const onMouseUp = useCallback(() => {
    if (action && action !== 'drag') setTimeout(() => mapInstance.current?.invalidateSize(), 50)
    setAction(null)
  }, [action])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',  onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])


  if (!pos) return null

  const edgeStyle = { position: 'absolute', zIndex: 500 }
  const EDGE = 6 // px

  return createPortal(
    <div
      className="fixed z-[200] rounded-2xl overflow-hidden shadow-2xl"
      style={{
        left: pos.x, top: pos.y, width: size.w,
        background: 'rgba(10,14,26,0.97)',
        backdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        userSelect: action ? 'none' : 'auto',
      }}
    >
      {/* 리사이즈 핸들 — 모서리 4개 + 엣지 4개 */}
      {/* 우하단 */}
      <div onMouseDown={onResizeStart('se')} style={{ ...edgeStyle, bottom: 0, right: 0, width: 18, height: 18, cursor: 'se-resize' }} />
      {/* 좌하단 */}
      <div onMouseDown={onResizeStart('sw')} style={{ ...edgeStyle, bottom: 0, left: 0, width: 18, height: 18, cursor: 'sw-resize' }} />
      {/* 우상단 */}
      <div onMouseDown={onResizeStart('ne')} style={{ ...edgeStyle, top: 0, right: 0, width: 18, height: 18, cursor: 'ne-resize' }} />
      {/* 좌상단 */}
      <div onMouseDown={onResizeStart('nw')} style={{ ...edgeStyle, top: 0, left: 0, width: 18, height: 18, cursor: 'nw-resize' }} />
      {/* 우 */}
      <div onMouseDown={onResizeStart('e')} style={{ ...edgeStyle, top: 18, right: 0, width: EDGE, bottom: 18, cursor: 'e-resize' }} />
      {/* 좌 */}
      <div onMouseDown={onResizeStart('w')} style={{ ...edgeStyle, top: 18, left: 0, width: EDGE, bottom: 18, cursor: 'w-resize' }} />
      {/* 하 */}
      <div onMouseDown={onResizeStart('s')} style={{ ...edgeStyle, bottom: 0, left: 18, right: 18, height: EDGE, cursor: 's-resize' }} />
      {/* 상 (헤더 제외 영역) */}
      <div onMouseDown={onResizeStart('n')} style={{ ...edgeStyle, top: 0, left: 18, right: 18, height: EDGE, cursor: 'n-resize' }} />

      {/* 드래그 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-move select-none"
        style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{country.flag}</span>
          <div>
            <div className="font-bold text-white text-sm">{country.name}</div>
            <div className="text-xs text-gray-400">Group {country.group} · {country.confederation}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">드래그·리사이즈 가능</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >✕</button>
        </div>
      </div>

      {/* 지도 */}
      <div className="relative">
        <div ref={mapRef} style={{ height: size.h - 54, width: '100%' }} />

        {/* 줌 버튼 */}
        <div className="absolute right-3 bottom-6 z-[400] flex flex-col gap-1">
          <button
            onClick={() => mapInstance.current?.zoomIn()}
            className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
          >+</button>
          <button
            onClick={() => mapInstance.current?.zoomOut()}
            className="w-8 h-8 rounded-lg font-bold text-lg flex items-center justify-center shadow-lg"
            style={{ background: 'rgba(10,14,26,0.9)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
          >−</button>
        </div>

        {/* 리사이즈 그립 아이콘 (우하단) */}
        <div
          className="absolute bottom-0 right-0 z-[500] p-1.5 cursor-se-resize"
          onMouseDown={onResizeStart('se')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 6L6 11M11 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="absolute bottom-1 left-2 z-[400] text-[9px] text-gray-600">© OpenStreetMap</div>
      </div>
    </div>,
    document.body
  )
}
