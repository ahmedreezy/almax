const USER_KEY  = 'vip_user'
const TOKEN_KEY = 'vip_token'

export function saveUser(user, token) {
  localStorage.setItem(USER_KEY,  JSON.stringify(user))
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (typeof window !== 'undefined') {
    const detail = { user, token: token || getToken() }
    window.dispatchEvent(new CustomEvent('user-logged-in', { detail }))
    window.dispatchEvent(new CustomEvent('user-auth-changed', { detail }))
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user-logged-out'))
    window.dispatchEvent(new CustomEvent('user-auth-changed', { detail: { user: null, token: null } }))
  }
}

export function isLoggedIn() {
  return !!getToken()
}
