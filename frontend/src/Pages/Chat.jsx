import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { API_URL, apiRequest } from '../api'
import { encodeProfileImage } from '../profileImage'

const idOf = (value) => String(value?._id || value)
const AIResponse = lazy(() => import('./AIResponse'))

function Avatar({ name, image, online, size = 'size-11' }) {
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full bg-cyan-100 font-bold text-cyan-800`}>
      {image
        ? <img src={image} alt="" className="size-full object-cover" />
        : name?.[0]?.toUpperCase() || '?'}
      {online !== undefined && (
        <span
          aria-label={online ? 'Online' : 'Offline'}
          className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-slate-300'}`}
        />
      )}
    </span>
  )
}

function Chat() {
  const navigate = useNavigate()
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const imageInputRef = useRef(null)
  const userSearchRequestRef = useRef(0)
  const shouldScrollToBottomRef = useRef(true)
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [activeUser, setActiveUser] = useState(null)
  const [aiActive, setAiActive] = useState(false)
  const [messages, setMessages] = useState([])
  const [aiMessages, setAiMessages] = useState([])
  const [aiHistoryHasMore, setAiHistoryHasMore] = useState(false)
  const [aiHistoryCursor, setAiHistoryCursor] = useState(null)
  const [loadingOlderAI, setLoadingOlderAI] = useState(false)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    let active = true

    async function startChat() {
      try {
        const [{ user }, { messages: savedAIMessages, hasMore, nextCursor }] = await Promise.all([
          apiRequest('users/me'),
          apiRequest('chat/ai/messages')
        ])
        if (!active) return

        setUser(user)
        setAiMessages(savedAIMessages)
        setAiHistoryHasMore(hasMore)
        setAiHistoryCursor(nextCursor)
        const socket = io(API_URL, { withCredentials: true })
        socketRef.current = socket
        socket.on('connect', () => setConnected(true))
        socket.on('disconnect', () => setConnected(false))
        socket.on('presence:snapshot', (onlineUsers) => {
          const onlineIds = new Set(onlineUsers)
          setUsers((current) => current.map((item) => ({
            ...item,
            online: onlineIds.has(idOf(item._id))
          })))
        })
        socket.on('presence:update', ({ userId, online }) => {
          setUsers((current) => current.map((item) =>
            idOf(item._id) === idOf(userId) ? { ...item, online } : item))
        })
        socket.on('profile:update', ({ userId, image }) => {
          setUsers((current) => current.map((item) =>
            idOf(item._id) === idOf(userId) ? { ...item, image } : item))
        })
        socket.on('connect_error', (err) => {
          setConnected(false)
          if (err.message === 'Unauthorized') navigate('/login', { replace: true })
          else setError('Live connection failed. Check the server.')
        })
      } catch (err) {
        if (active) {
          if (['Unauthorized', 'Invalid Token', 'User Not Found'].includes(err.message)) {
            navigate('/login', { replace: true })
          } else {
            setError(err.message)
          }
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    startChat()
    return () => {
      active = false
      socketRef.current?.disconnect()
    }
  }, [navigate])

  useEffect(() => {
    let active = true
    const requestId = ++userSearchRequestRef.current

    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          page: '1',
          search: search.trim()
        })
        const result = await apiRequest(`chat/users?${query}`)
        if (!active || requestId !== userSearchRequestRef.current) return

        setUsers(result.users)
        setUsersPage(result.nextPage || 1)
        setUsersHasMore(result.hasMore)
      } catch (err) {
        if (active && requestId === userSearchRequestRef.current) setError(err.message)
      } finally {
        if (active && requestId === userSearchRequestRef.current) setUsersLoading(false)
      }
    }, search ? 200 : 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search])

  useEffect(() => {
    if (!activeUser) return undefined

    let active = true
    apiRequest(`chat/${activeUser._id}/messages`)
      .then(({ messages }) => active && setMessages(messages))
      .catch((err) => active && setError(err.message))

    return () => {
      active = false
    }
  }, [activeUser])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !user || !activeUser) return undefined

    function receiveMessage(message) {
      const otherUserId = idOf(message.sender) === idOf(user._id)
        ? idOf(message.recipient)
        : idOf(message.sender)

      if (otherUserId !== idOf(activeUser._id)) return
      setMessages((current) => current.some((item) => idOf(item._id) === idOf(message._id))
        ? current
        : [...current, message])
    }

    socket.on('chat:message', receiveMessage)
    return () => socket.off('chat:message', receiveMessage)
  }, [activeUser, user])

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    shouldScrollToBottomRef.current = true
  }, [messages, aiMessages])

  useEffect(() => {
    if (!accountOpen) return undefined

    function closeOnEscape(event) {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [accountOpen])

  async function logout() {
    try {
      await apiRequest('users/logout', { method: 'POST' })
      socketRef.current?.disconnect()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  function selectUser(item) {
    if (activeUser?._id === item._id && !aiActive) return
    setActiveUser(item)
    setAiActive(false)
    setMessages([])
    setError('')
  }

  function selectAI() {
    setActiveUser(null)
    setAiActive(true)
    setError('')
  }

  async function loadMoreUsers() {
    if (usersLoading || !usersHasMore) return
    const requestId = ++userSearchRequestRef.current
    setUsersLoading(true)
    try {
      const query = new URLSearchParams({
        page: String(usersPage),
        search: search.trim()
      })
      const result = await apiRequest(`chat/users?${query}`)
      if (requestId !== userSearchRequestRef.current) return

      setUsers((current) => [...current, ...result.users])
      setUsersPage(result.nextPage || usersPage)
      setUsersHasMore(result.hasMore)
    } catch (err) {
      if (requestId === userSearchRequestRef.current) setError(err.message)
    } finally {
      if (requestId === userSearchRequestRef.current) setUsersLoading(false)
    }
  }

  async function loadOlderAIMessages() {
    if (loadingOlderAI || !aiHistoryHasMore || !aiHistoryCursor) return
    setLoadingOlderAI(true)
    try {
      const { messages: olderMessages, hasMore, nextCursor } = await apiRequest(
        `chat/ai/messages?before=${encodeURIComponent(aiHistoryCursor)}`
      )
      if (olderMessages.length > 0) {
        shouldScrollToBottomRef.current = false
        setAiMessages((current) => [...olderMessages, ...current])
      }
      setAiHistoryHasMore(hasMore)
      setAiHistoryCursor(nextCursor)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingOlderAI(false)
    }
  }

  async function saveProfilePhoto(image) {
    try {
      const { user: updatedUser } = await apiRequest('users/me', {
        method: 'PATCH',
        body: JSON.stringify({ image })
      })
      setUser(updatedUser)
      setUsers((current) => current.map((item) =>
        idOf(item._id) === idOf(updatedUser._id)
          ? { ...item, image: updatedUser.image }
          : item))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function saveProfileDetails(event) {
    event.preventDefault()
    setSavingProfile(true)
    setError('')
    try {
      const { user: updatedUser } = await apiRequest('users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameDraft.trim() })
      })
      setUser(updatedUser)
      setEditingProfile(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP photo under 1 MB.')
      return
    }

    try {
      await saveProfilePhoto(await encodeProfileImage(file))
    } catch (err) {
      setError(err.message)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setError('')

    if (aiActive) {
      const userMessage = { id: `${Date.now()}-user`, role: 'user', text }
      const updatedMessages = [...aiMessages, userMessage]
      setAiMessages(updatedMessages)
      setDraft('')
      setSending(true)
      try {
        const { answer, exchangeId } = await apiRequest('chat/ai', {
          method: 'POST',
          body: JSON.stringify({
            messages: updatedMessages.slice(-20).map(({ role, text: messageText }) => ({
              role,
              text: messageText
            }))
          })
        })
        setAiMessages((current) => [
          ...current.map((message) => message.id === userMessage.id
            ? { ...message, id: `${exchangeId}-user` }
            : message),
          {
            id: `${exchangeId}-model`,
            role: 'model',
            text: answer
          }
        ])
      } catch (err) {
        setAiMessages((current) => current.filter((message) => message.id !== userMessage.id))
        setError(err.message)
      } finally {
        setSending(false)
      }
      return
    }

    const socket = socketRef.current
    if (!activeUser || !socket?.connected) {
      if (!socket?.connected) setError('Not connected to chat. Please try again.')
      return
    }

    setSending(true)
    socket.emit('chat:send', { recipientId: activeUser._id, text }, (result) => {
      setSending(false)
      if (result?.error) setError(result.error)
      else setDraft('')
    })
  }

  const visibleUsers = users
  const hasActiveChat = Boolean(activeUser || aiActive)

  return (
    <main className="min-h-screen bg-[#eaf2f8] p-3 font-sans sm:p-6">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:h-[calc(100vh-3rem)]">
        <aside className={`${hasActiveChat ? 'hidden md:flex' : 'flex'} w-full flex-col border-r border-slate-100 md:w-80 md:shrink-0`}>
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400 text-sm font-bold text-white">V</span>
              <h1 className="truncate font-bold text-slate-800">Vartam</h1>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setNameDraft(user?.name || '')
                  setEditingProfile(false)
                  setAccountOpen(true)
                }}
                className="rounded-lg px-2 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 sm:text-sm"
              >
                My account
              </button>
              <button onClick={logout} className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:text-sm">
                Log out
              </button>
            </div>
          </header>

          <div className="p-4">
            <h2 className="text-lg font-bold text-slate-800">Messages</h2>
            <input
              value={search}
              onChange={(event) => {
                userSearchRequestRef.current += 1
                setUsersLoading(true)
                setSearch(event.target.value)
              }}
              placeholder="Find people"
              aria-label="Find people"
              className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <button
              onClick={selectAI}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${aiActive ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">AI</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-800">Vartam AI</span>
                <span className="block truncate text-xs text-slate-500">Ask me anything</span>
              </span>
            </button>

            {visibleUsers.map((item) => (
              <button
                key={item._id}
                onClick={() => selectUser(item)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeUser?._id === item._id && !aiActive ? 'bg-cyan-50' : 'hover:bg-slate-50'}`}
              >
                <Avatar name={item.userName} image={item.image} online={item.online} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{item.userName}</span>
                  <span className="block truncate text-xs text-slate-500">{item.online ? 'Online' : item.email}</span>
                </span>
              </button>
            ))}
            {usersHasMore && (
              <button
                type="button"
                onClick={loadMoreUsers}
                disabled={usersLoading}
                className="my-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:opacity-50"
              >
                {usersLoading ? 'Loading people…' : 'Load more people'}
              </button>
            )}
            {!usersLoading && visibleUsers.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                {search ? 'No matching people found.' : loading ? 'Loading people…' : 'No other users yet.'}
              </p>
            )}
          </div>
        </aside>

        <section className={`${hasActiveChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
          {hasActiveChat ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
                <button
                  onClick={() => {
                    setActiveUser(null)
                    setAiActive(false)
                  }}
                  aria-label="Back to conversations"
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 md:hidden"
                >
                  ←
                </button>
                {aiActive
                  ? <span className="grid size-10 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">AI</span>
                  : <Avatar name={activeUser?.userName} image={activeUser?.image} online={activeUser?.online} size="size-10" />}
                <div>
                  <h2 className="font-bold text-slate-800">{aiActive ? 'Vartam AI' : activeUser?.userName}</h2>
                  <p className="text-xs text-slate-500">
                    {aiActive
                      ? 'Powered by Gemini'
                      : activeUser?.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                {aiActive ? (
                  <>
                    {aiHistoryHasMore && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={loadOlderAIMessages}
                          disabled={loadingOlderAI}
                          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50 disabled:opacity-50"
                        >
                          {loadingOlderAI ? 'Loading older messages…' : 'Load older messages'}
                        </button>
                      </div>
                    )}
                    {aiMessages.map((message) => {
                    const mine = message.role === 'user'
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${mine ? 'rounded-br-sm bg-cyan-400 text-slate-900' : 'rounded-bl-sm bg-white text-slate-800'}`}>
                          {mine
                            ? <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                            : (
                              <div className="break-words text-sm text-slate-800">
                                <Suspense fallback={<p className="text-slate-500">Loading response…</p>}>
                                  <AIResponse text={message.text} />
                                </Suspense>
                              </div>
                            )}
                        </div>
                      </div>
                    )
                    })}
                  </>
                ) : (
                  messages.map((message) => {
                    const mine = idOf(message.sender) === idOf(user?._id)
                    return (
                      <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[65%] ${mine ? 'rounded-br-sm bg-cyan-400 text-slate-900' : 'rounded-bl-sm bg-white text-slate-800'}`}>
                          <p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>
                          <time className="mt-1 block text-right text-[10px] opacity-60">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                      </div>
                    )
                  })
                )}
                {aiActive && sending && <p className="text-sm text-slate-500">Vartam AI is typing…</p>}
                {((aiActive && aiMessages.length === 0) || (!aiActive && messages.length === 0)) && (
                  <p className="pt-10 text-center text-sm text-slate-500">
                    {aiActive ? 'Ask Vartam AI a question to get started.' : 'Say hello to start the conversation.'}
                  </p>
                )}
                <div ref={messagesEndRef} />
              </div>

              {error && <p role="alert" className="px-5 pt-3 text-sm text-red-600">{error}</p>}
              <form onSubmit={sendMessage} className="flex items-center gap-3 border-t border-slate-100 p-3 sm:p-4">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={aiActive ? 'Ask Vartam AI…' : 'Write a message…'}
                  aria-label={aiActive ? 'Ask Vartam AI' : 'Write a message'}
                  maxLength={aiActive ? 4000 : 2000}
                  className="min-w-0 flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim() || (!aiActive && !connected)}
                  className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-slate-50/70 p-8 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-cyan-100 text-2xl font-bold text-cyan-700">V</span>
              <h2 className="mt-5 text-xl font-bold text-slate-800">Your conversations</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Choose someone from the list to chat, or open Vartam AI to ask a question.
              </p>
              {loading && <p className="mt-4 text-sm text-cyan-700">Loading your chats…</p>}
              {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </section>
      </div>

      {accountOpen && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAccountOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 id="account-title" className="text-lg font-bold text-slate-800">My account</h2>
                <p className="text-sm text-slate-500">Your profile details</p>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                aria-label="Close account details"
                className="grid size-9 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </header>

            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar name={user.userName} image={user.image} size="size-24" />
                <h3 className="mt-3 text-lg font-bold text-slate-800">{user.userName}</h3>
                <p className="text-sm text-slate-500">{user.email}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                  >
                    {user.image ? 'Change photo' : 'Add profile photo'}
                  </button>
                  {user.image && (
                    <button
                      type="button"
                      onClick={() => saveProfilePhoto('')}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Remove photo
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                    aria-label="Choose profile photo"
                  />
                </div>
              </div>

              <dl className="mt-6 divide-y divide-slate-100 rounded-2xl bg-slate-50 px-4">
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="text-right font-medium text-slate-800">{user.name || 'Not added'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-slate-500">Username</dt>
                  <dd className="break-all text-right font-medium text-slate-800">{user.userName}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="break-all text-right font-medium text-slate-800">{user.email}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-slate-500">Member since</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : '—'}
                  </dd>
                </div>
              </dl>
              {editingProfile ? (
                <form onSubmit={saveProfileDetails} className="mt-5 space-y-3">
                  <label className="block text-left text-sm font-medium text-slate-600">
                    Name
                    <input
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      maxLength={60}
                      autoComplete="name"
                      placeholder="Add your name"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNameDraft(user.name || '')
                        setEditingProfile(false)
                        setError('')
                      }}
                      className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving…' : 'Save name'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(user.name || '')
                    setEditingProfile(true)
                    setError('')
                  }}
                  className="mt-5 w-full rounded-xl border border-cyan-200 px-4 py-2.5 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                >
                  Edit profile details
                </button>
              )}
              {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default Chat
