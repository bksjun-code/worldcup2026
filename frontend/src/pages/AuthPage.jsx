import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', nickname: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.email, form.nickname, form.password)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="font-bebas text-4xl text-wc-gold tracking-widest">FIFA 2026</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'login' ? '로그인하여 베팅에 참가하세요' : '회원가입하고 100,000P 받기'}
          </p>
        </div>

        <div className="wc-card p-8">
          {/* 탭 */}
          <div className="flex mb-6 border rounded-lg overflow-hidden" style={{borderColor:'rgba(255,255,255,0.1)'}}>
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 text-sm font-bold transition-colors ${
                  mode === m ? 'bg-wc-gold text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m === 'login' ? '로그인' : '회원가입'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                required
                placeholder="email@example.com"
                className="glass-input w-full px-4 py-3 text-sm"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">닉네임</label>
                <input
                  type="text"
                  value={form.nickname}
                  onChange={update('nickname')}
                  required
                  placeholder="닉네임 (2~12자)"
                  minLength={2}
                  maxLength={12}
                  className="glass-input w-full px-4 py-3 text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 mb-1 block">비밀번호</label>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                placeholder="••••••••"
                minLength={6}
                className="glass-input w-full px-4 py-3 text-sm"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-sm">
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {mode === 'register' && (
            <p className="text-center text-xs text-gray-500 mt-4">
              가입 즉시 <span className="text-wc-gold font-bold">100,000 포인트</span> 지급
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
