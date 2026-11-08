export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie<string | null>('token').value
  
  // اگر لاگین است و روی صفحه login است، بفرستش داشبورد
  if (token && to.path === '/login') {
    return navigateTo('/dashboard')
  }
  
  // اگر لاگین نیست و روی صفحه محافظت شده است (غیر از login و index)، بفرستش login
  if (!token && to.path !== '/login' && to.path !== '/') {
    return navigateTo('/login')
  }
})
  