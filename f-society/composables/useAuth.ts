type LoginPayload = { email: string; password: string }
type LoginResponse = { token: string; user: { id: string; name: string; email: string } }

export function useAuth() {
  const token = useCookie<string | null>('token', { sameSite: 'lax' })
  const user = useState<LoginResponse['user'] | null>('user', () => null)
  const pending = useState('authPending', () => false)
  const error = useState<string | null>('authError', () => null)

  async function login(payload: LoginPayload) {
    try {
      pending.value = true
      error.value = null
      const { data, error: err } = await useFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: payload,
      })
      if (err.value) throw err.value
      if (!data.value) throw new Error('No data')

      token.value = data.value.token
      user.value = data.value.user
      return true
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Login failed'
      return false
    } finally {
      pending.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, pending, error, login, logout }
}
