import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api'
import { encodeProfileImage } from '../profileImage'

function AuthPage({ mode }) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()
  const [form, setForm] = useState({ userName: '', email: '', password: '', image: '' })
  const imageInputRef = useRef(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiRequest('users/me')
      .then(() => active && navigate('/chat', { replace: true }))
      .catch((err) => {
        if (active && !['Unauthorized', 'Invalid Token'].includes(err.message)) {
          setError('Unable to connect to the server.')
        }
      })

    return () => {
      active = false
    }
  }, [navigate])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP photo under 1 MB.')
      return
    }

    try {
      const image = await encodeProfileImage(file)
      setForm((current) => ({ ...current, image }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await apiRequest(`users/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        body: JSON.stringify(isSignup ? form : { email: form.email, password: form.password }),
      })
      navigate('/chat', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eaf2f8] p-4 font-sans sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:min-h-[600px] md:grid-cols-2">
        <section className="order-2 flex flex-col justify-center px-7 py-9 sm:px-12 md:order-1">
          <Link to="/signup" className="flex w-fit items-center gap-2 font-bold text-slate-800">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-400 text-sm font-bold text-white">UV</span>
            Vartam
          </Link>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-600">
              {isSignup ? 'Get started' : 'Welcome back'}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-800">
              {isSignup ? 'Create your account' : 'Sign in to Vartam'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Stay close to the people who matter.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                {isSignup && (
                  <label className="block text-sm font-medium text-slate-600">
                    Username
                    <input
                      name="userName"
                      value={form.userName}
                      onChange={handleChange}
                      autoComplete="username"
                      required
                      className="mt-1.5 w-full rounded-xl border border-cyan-400 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder="Your username"
                    />
                  </label>
                )}

                {isSignup && (
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 font-bold text-cyan-800">
                      {form.image
                        ? <img src={form.image} alt="Profile photo preview" className="size-full object-cover" />
                        : form.userName?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <label className="block text-sm font-medium text-slate-600" htmlFor="profile-image">
                        Profile photo <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        ref={imageInputRef}
                        id="profile-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        className="mt-1 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-3 file:py-2 file:font-semibold file:text-cyan-700"
                      />
                    </div>
                    {form.image && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, image: '' }))
                          if (imageInputRef.current) imageInputRef.current.value = ''
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}

                <label className="block text-sm font-medium text-slate-600">
                  Email
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    className="mt-1.5 w-full rounded-xl border border-cyan-400 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-600">
                  Password
                  <span className="relative mt-1.5 block">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      minLength={isSignup ? 12 : undefined}
                      maxLength={72}
                      required
                      className="w-full rounded-xl border border-cyan-400 bg-white px-4 py-3 pr-16 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100"
                      placeholder={isSignup ? 'At least 12 characters' : 'Your password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 text-sm font-semibold text-cyan-700"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-900 shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? 'Please wait…' : isSignup ? 'Sign up' : 'Login'}
                </button>
            </form>

            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}

            <p className="mt-6 text-sm text-slate-600">
              {isSignup ? 'Already have an account?' : 'New to Vartam?'}{' '}
              <Link
                to={isSignup ? '/login' : '/signup'}
                className="font-semibold text-cyan-700 hover:text-cyan-900"
              >
                {isSignup ? 'Login' : 'Create account'}
              </Link>
            </p>
          </div>
        </section>

        <aside className="relative order-1 flex min-h-52 items-center justify-center overflow-hidden bg-cyan-400 px-8 py-10 text-slate-900 md:order-2 md:min-h-full md:rounded-l-[7rem]">
          <div className="absolute -right-12 -top-16 size-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-10 size-64 rounded-full bg-cyan-300/70" />
          <div className="relative max-w-sm text-center">
            <span className="inline-flex rounded-full bg-white/25 px-4 py-2 text-sm font-semibold">
              A little closer, every day
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome to <span className="text-white">Vartam</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xs leading-7 text-cyan-950/75">
              Good conversations start with a hello. Sign in or create an account to get started.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default AuthPage
