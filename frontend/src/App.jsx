import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import SchedulePage from './pages/SchedulePage'
import CountriesPage from './pages/CountriesPage'
import BettingPage from './pages/BettingPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import useStore from './store/useStore'

const THEME_ORBS = {
  dark: [
    'bg-wc-blue/15 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-wc-red/10 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-wc-gold/7 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-purple-900/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  ocean: [
    'bg-cyan-700/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-teal-600/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-sky-700/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-blue-900/15 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  forest: [
    'bg-green-800/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-emerald-700/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-green-600/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-teal-900/15 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  purple: [
    'bg-purple-800/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-violet-700/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-indigo-600/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-fuchsia-900/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  sunset: [
    'bg-orange-700/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-amber-600/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-red-700/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-yellow-900/12 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  crimson: [
    'bg-red-800/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-rose-700/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-red-600/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-orange-900/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  slate: [
    'bg-slate-600/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-blue-800/12 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-slate-500/8 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-gray-700/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  rose: [
    'bg-pink-700/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-rose-600/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-fuchsia-700/10 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-pink-900/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
  ],
  gold: [
    'bg-yellow-700/20 -top-32 -left-32 w-[480px] h-[480px] blur-[130px]',
    'bg-amber-600/15 top-1/3 -right-40 w-[380px] h-[380px] blur-[110px]',
    'bg-wc-gold/12 bottom-0 left-1/4 w-[480px] h-[480px] blur-[130px]',
    'bg-orange-800/10 top-2/3 right-1/4 w-[280px] h-[280px] blur-[90px]',
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

  const orbs = THEME_ORBS[theme] ?? THEME_ORBS.dark

  return (
    <div className="min-h-screen bg-wc-dark">
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
      </Routes>
    </div>
  )
}
