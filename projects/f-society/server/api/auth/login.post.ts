export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  // اعتبارسنجی ساده
  if (!body?.email || !body?.password) {
    throw createError({ statusCode: 400, statusMessage: 'ایمیل و رمز عبور الزامی است' })
  }

  // ماک: ایمیل و رمز خاص را قبول می‌کنیم
  if (body.email === 'demo@site.com' && body.password === 'Demo1234!') {
    return {
      token: 'demo-token-123',
      user: { id: 'u_1', name: 'کاربر دمو', email: body.email },
    }
  }

  throw createError({ statusCode: 401, statusMessage: 'ایمیل یا رمز عبور نادرست است' })
})
