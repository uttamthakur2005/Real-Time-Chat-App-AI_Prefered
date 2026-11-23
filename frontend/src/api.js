export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}/${path}`, {
    ...options,
    credentials: 'include',
    headers: options.body
      ? { 'Content-Type': 'application/json', ...options.headers }
      : options.headers,
  })
  const data = await response.json()

  if (!response.ok) {
    const message = Array.isArray(data.errors)
      ? data.errors.map((error) => error.msg).join(', ')
      : data.message || data.errors
    throw new Error(message || 'Something went wrong')
  }

  return data
}
