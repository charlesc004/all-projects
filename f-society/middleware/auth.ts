export default defineNuxtRouteMiddleware(() => {
  const token = useCookie<string | null>('token').value
  
  if (!token) {
    return navigateTo('/login')
  }
})

