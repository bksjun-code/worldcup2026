import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import useStore from '../store/useStore'

const NAV_LINKS = [
  { path: '/', label: '홈' },
  { path: '/schedule', label: '대진표' },
  { path: '/countries', label: '참가국' },
  { path: '/betting', label: '🏆 베팅' },
  { path: '/rankings', label: '📊 포인트순위' },
]

const THEMES = [
  { id: 'pure-dark',   label: '⬛ 퓨어 다크',      color: '#1a1a1a' },
  { id: 'dark-navy',   label: '🌌 다크 네이비',    color: '#1e3a6e' },
  { id: 'github-dark', label: '🐙 GitHub 다크',    color: '#30363D' },
  { id: 'glass',       label: '🔮 글래스모피즘',   color: '#6B48C8' },
]

function ThemeSwitcher() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
        style={{background:'var(--switcher-bg)', border:'1px solid var(--switcher-border)'}}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: current.color }}
        />
        <span style={{ color: 'var(--text-secondary)' }}>{current.label}</span>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-xl py-1 min-w-[160px] overflow-hidden"
            style={{background:'var(--dropdown-bg)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid var(--dropdown-border)', boxShadow:'var(--dropdown-shadow)'}}
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors"
                style={{ color: theme === t.id ? 'var(--dropdown-text-active)' : 'var(--dropdown-text)', background: theme === t.id ? 'var(--dropdown-item-active)' : 'transparent' }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span>{t.label}</span>
                {theme === t.id && <span className="ml-auto text-wc-gold text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const location = useLocation()
  const { user, logout } = useStore()
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full z-50 border-b" style={{background:'var(--nav-bg)', backdropFilter:'blur(32px) saturate(180%)', WebkitBackdropFilter:'blur(32px) saturate(180%)', borderColor:'var(--nav-border)', boxShadow:'0 1px 0 rgba(200,168,75,0.06), 0 4px 24px rgba(0,0,0,0.12)'}}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* 로고 */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="font-bebas text-xl text-wc-gold tracking-widest">FIFA 2026</span>
        </Link>

        {/* 데스크톱 메뉴 */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === l.path
                  ? 'text-wc-gold glow-gold'
                  : 'text-gray-300 hover:text-wc-gold'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* 테마 + 유저 영역 */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeSwitcher />
          <div className="w-px h-4 bg-white/10" />
          {user ? (
            <>
              <span className="text-wc-gold font-bold text-sm">
                {user.nickname} · {user.points.toLocaleString()}P
              </span>
              {user.is_admin && (
                <Link to="/admin" className="text-xs text-red-400 hover:text-red-300">관리자</Link>
              )}
              <button onClick={logout} className="text-xs text-gray-400 hover:text-white">로그아웃</button>
            </>
          ) : (
            <Link to="/auth" className="btn-gold text-sm py-2 px-4">로그인 / 가입</Link>
          )}
        </div>

        {/* 모바일 햄버거 */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* 모바일 드롭다운 */}
      {open && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-3" style={{background:'var(--nav-mobile-bg)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderColor:'var(--nav-border)'}}>
          {NAV_LINKS.map((l) => (
            <Link key={l.path} to={l.path} className="text-gray-300 hover:text-wc-gold" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-gray-500">테마</span>
            <ThemeSwitcher />
          </div>
          {user ? (
            <button onClick={() => { logout(); setOpen(false) }} className="text-left text-red-400 text-sm">로그아웃</button>
          ) : (
            <Link to="/auth" className="btn-gold text-sm text-center" onClick={() => setOpen(false)}>로그인 / 가입</Link>
          )}
        </div>
      )}
    </nav>
  )
}
