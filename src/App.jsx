import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'

function StatCard({ title, value, accent = false }) {
  return (
    <div className={`rounded-xl border bg-white/80 backdrop-blur p-4 shadow-sm ${accent ? 'border-emerald-200' : 'border-gray-200'}`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-emerald-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}

function TopBar({ user, onLogout }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#004AAD] text-white grid place-items-center font-bold">B</div>
        <div>
          <p className="font-semibold text-gray-800">Base44 – Sales Monitor</p>
          <p className="text-xs text-gray-500">Real‑time targets & customer progress</p>
        </div>
      </div>
      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user.name} • {user.role.toUpperCase()}</span>
          <button onClick={onLogout} className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50">Logout</button>
        </div>
      ) : null}
    </div>
  )
}

function LoginForm({ onSuccess, backendUrl }) {
  const [email, setEmail] = useState('admin@base44.local')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const body = new URLSearchParams()
      body.append('username', email)
      body.append('password', password)

      const res = await fetch(`${backendUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Login failed')
      }
      const data = await res.json()
      localStorage.setItem('access_token', data.access_token)
      onSuccess(data.access_token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur rounded-xl p-6 shadow-md space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 focus:border-[#004AAD] focus:ring-[#004AAD]"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 focus:border-[#004AAD] focus:ring-[#004AAD]"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-md text-white font-semibold bg-[#004AAD] hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-xs text-gray-500 text-center">Tip: Use the pre‑seeded admin account above</p>
    </form>
  )
}

function Dashboard({ user, backendUrl, token }) {
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState([])
  const [customers, setCustomers] = useState([])
  const [report, setReport] = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const h = { Authorization: `Bearer ${token}` }
        const [tRes, cRes, rRes] = await Promise.all([
          fetch(`${backendUrl}/targets`, { headers: h }),
          fetch(`${backendUrl}/customers`, { headers: h }),
          fetch(`${backendUrl}/reports/targets-vs-progress`, { headers: h }),
        ])
        const [t, c, r] = await Promise.all([tRes.json(), cRes.json(), rRes.json()])
        setTargets(Array.isArray(t) ? t : [])
        setCustomers(Array.isArray(c) ? c : [])
        setReport(r)
      } catch (e) {
        // ignore for now
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [backendUrl, token])

  const totalTarget = useMemo(() => targets.reduce((s, x) => s + (x.amount || 0), 0), [targets])
  const currency = report?.currency || 'USD'
  const progress = report?.progress_value || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Target" value={new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(totalTarget)} accent />
        <StatCard title="Pipeline Value" value={new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(progress)} />
        <StatCard title="Active Customers" value={customers.length} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Quick View</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{user.role.toUpperCase()}</span>
        </div>
        {user.role === 'admin' && (
          <ul className="text-sm text-gray-700 grid sm:grid-cols-2 gap-2 list-disc pl-5">
            <li>Manage users (Admin, GM, AM)</li>
            <li>Set department & AM targets</li>
            <li>View org‑wide reports</li>
            <li>Reset passwords</li>
          </ul>
        )}
        {user.role === 'gm' && (
          <ul className="text-sm text-gray-700 grid sm:grid-cols-2 gap-2 list-disc pl-5">
            <li>Manage assigned AMs</li>
            <li>Set AM targets for your department</li>
            <li>Track department pipeline</li>
            <li>Reset AM passwords</li>
          </ul>
        )}
        {user.role === 'am' && (
          <ul className="text-sm text-gray-700 grid sm:grid-cols-2 gap-2 list-disc pl-5">
            <li>View personal targets</li>
            <li>Manage prospective customers</li>
            <li>Log meetings & follow‑ups</li>
            <li>Presentation mode for deals</li>
          </ul>
        )}
      </div>
    </div>
  )
}

function App() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [token, setToken] = useState(localStorage.getItem('access_token') || '')
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!token)

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken('')
    setUser(null)
  }

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) return
      try {
        const res = await fetch(`${backendUrl}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          logout()
        }
      } catch (e) {
        logout()
      } finally {
        setChecking(false)
      }
    }
    fetchMe()
  }, [token, backendUrl])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="relative h-[56vh] sm:h-[60vh]">
        <Spline scene="https://prod.spline.design/8nsoLg1te84JZcE9/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 via-white/30 to-white" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-xl space-y-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#004AAD]/10 text-[#004AAD] border border-[#004AAD]/20">Base44</span>
              <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">Sales Monitor for Admins, GMs & AMs</h1>
              <p className="text-gray-600 max-w-prose">Clean, role‑based dashboards to track targets, pipeline, and customer progress in real time.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <TopBar user={user} onLogout={logout} />
              <div className="mt-6">
                {!user ? (
                  <div>
                    <h2 className="text-xl font-semibold mb-3">Sign in to your dashboard</h2>
                    <LoginForm onSuccess={setToken} backendUrl={backendUrl} />
                    <p className="mt-3 text-xs text-gray-500">Roles supported: Admin, GM, AM. The first login uses a demo administrator account.</p>
                  </div>
                ) : (
                  <Dashboard user={user} backendUrl={backendUrl} token={token} />
                )}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800">Highlights</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>Role‑based access control</li>
                <li>Targets by department & AM</li>
                <li>Customer pipeline tracking</li>
                <li>Export‑ready reporting</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h3 className="font-semibold text-emerald-800">Design System</h3>
              <p className="mt-2 text-sm text-emerald-800">Primary: #004AAD • Accent: #00C49A • Font: Inter</p>
            </div>
          </aside>
        </div>
      </div>

      <footer className="mt-16 py-8 border-t text-center text-sm text-gray-500">© {new Date().getFullYear()} Base44 • Sales Monitor</footer>
    </div>
  )
}

export default App
