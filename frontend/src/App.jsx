import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import SchedulePage from './pages/SchedulePage'
import CountriesPage from './pages/CountriesPage'
import BettingPage from './pages/BettingPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import RankingsPage from './pages/RankingsPage'
import BoardPage from './pages/BoardPage'
import useStore from './store/useStore'

const THEME_ORBS = {
  'pure-dark': [
    'bg-zinc-700/8 -top-32 -left-32 w-[520px] h-[520px] blur-[150px]',
    'bg-neutral-600/6 top-1/3 -right-40 w-[400px] h-[400px] blur-[130px]',
    'bg-wc-gold/5 bottom-0 left-1/4 w-[500px] h-[500px] blur-[150px]',
    'bg-zinc-800/5 top-2/3 right-1/4 w-[300px] h-[300px] blur-[110px]',
  ],
  'dark-navy': [
    'bg-blue-900/30 -top-32 -left-32 w-[520px] h-[520px] blur-[130px]',
    'bg-indigo-800/22 top-1/3 -right-40 w-[400px] h-[400px] blur-[110px]',
    'bg-blue-700/14 bottom-0 left-1/4 w-[520px] h-[520px] blur-[130px]',
    'bg-slate-700/18 top-2/3 right-1/4 w-[300px] h-[300px] blur-[90px]',
  ],
  'github-dark': [
    'bg-gray-700/15 -top-32 -left-32 w-[520px] h-[520px] blur-[140px]',
    'bg-blue-900/10 top-1/3 -right-40 w-[400px] h-[400px] blur-[120px]',
    'bg-gray-600/8 bottom-0 left-1/4 w-[520px] h-[520px] blur-[140px]',
    'bg-slate-800/12 top-2/3 right-1/4 w-[300px] h-[300px] blur-[100px]',
  ],
  'glass': [
    'bg-violet-700/35 -top-32 -left-32 w-[600px] h-[600px] blur-[120px]',
    'bg-indigo-600/28 top-1/3 -right-40 w-[500px] h-[500px] blur-[100px]',
    'bg-purple-800/22 bottom-0 left-1/4 w-[580px] h-[580px] blur-[120px]',
    'bg-blue-700/20 top-2/3 right-1/4 w-[360px] h-[360px] blur-[90px]',
  ],
}

export default function App() {
  const initAuth = useStore((s) => s.initAuth)
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const orbs = THEME_ORBS[theme] ?? THEME_ORBS['pure-dark']

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* 전역 배경 Orb */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {orbs.map((cls, i) => (
          <div key={i} className={`absolute rounded-full ${cls}`} />
        ))}
      </div>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/countries" element={<CountriesPage />} />
        <Route path="/betting" element={<BettingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/board" element={<BoardPage />} />
      </Routes>
    </div>
  )
}
