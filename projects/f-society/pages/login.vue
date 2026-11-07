<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const touched = ref(false)

const { login, pending, error } = useAuth()

// اعتبارسنجی ساده (می‌توان با zod/vee-validate حرفه‌ای‌ترش کرد)
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))
const passwordValid = computed(() => password.value.length >= 8)
const formValid = computed(() => emailValid.value && passwordValid.value)

async function handleSubmit() {
  touched.value = true
  if (!formValid.value) return
  const ok = await login({ email: email.value, password: password.value })
  if (ok) navigateTo('/dashboard')
}
</script>

<template>
  <div class="w-full max-w-md mx-auto  mt-20">
    <div
      class="relative rounded-3xl p-8 shadow-2xl bg-slate-800/90 backdrop-blur border border-slate-600/50 overflow-hidden"
    >
      <!-- هاله‌های پس‌زمینه -->
      <div class="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-500/30 blur-3xl"></div>

      <div class="mb-6 text-center space-y-2">
        <h1 class="text-2xl font-extrabold tracking-tight text-white">ورود به حساب</h1>
        <p class="text-emerald-200 text-sm">خوش آمدید! لطفاً ایمیل و رمز عبور خود را وارد کنید.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- ایمیل -->
        <div class="space-y-1">
          <label class="block text-sm text-emerald-200">ایمیل</label>
          <input
            v-model="email"
            type="email"
            placeholder="demo@site.com"
            dir="ltr"
            class="w-full rounded-xl bg-emerald-950/80 border border-emerald-700/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none px-4 py-3 text-white placeholder-emerald-400 transition"
          />
          <p v-if="touched && !emailValid" class="text-xs text-rose-400">ایمیل معتبر نیست.</p>
        </div>

        <!-- رمز عبور -->
        <div class="space-y-1">
          <label class="block text-sm text-emerald-200">رمز عبور</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="حداقل ۸ کاراکتر"
              dir="ltr"
              class="w-full rounded-xl bg-emerald-950/80 border border-emerald-700/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none px-4 py-3 pr-12 text-white placeholder-emerald-400 transition"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-2 my-auto px-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-700/50 transition"
              aria-label="Toggle password"
            >
              <span v-if="showPassword">🙈</span>
              <span v-else>👁️</span>
            </button>
          </div>
          <p v-if="touched && !passwordValid" class="text-xs text-rose-400">رمز عبور باید حداقل ۸ کاراکتر باشد.</p>
        </div>

        <!-- دکمه -->
        <button
          :disabled="pending || !formValid"
          class="group w-full py-3 rounded-xl font-semibold transition text-white
                 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 
                 disabled:opacity-50 disabled:cursor-not-allowed
                 shadow-[0_8px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_10px_35px_rgba(16,185,129,0.6)]"
        >
          <span v-if="!pending">ورود</span>
          <span v-else class="inline-flex items-center gap-2">
            <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"/>
            </svg>
            در حال ورود...
          </span>
        </button>

        <!-- خطا -->
        <p v-if="error" class="text-sm text-rose-400 text-center">{{ error }}</p>

        <!-- Divider -->
        <div class="flex items-center gap-4">
          <div class="h-px flex-1 bg-emerald-700/50"></div>
          <span class="text-xs text-emerald-300">یا</span>
          <div class="h-px flex-1 bg-emerald-700/50"></div>
        </div>

        <!-- دکمه‌های اجتماعی (غیرفعالِ نمایشی) -->
        <div class="grid grid-cols-2 gap-3">
          <button type="button" class="rounded-xl border border-emerald-700/50 bg-emerald-950/60 hover:bg-emerald-800/60 px-4 py-3 text-emerald-200 transition">ورود با گوگل</button>
          <button type="button" class="rounded-xl border border-emerald-700/50 bg-emerald-950/60 hover:bg-emerald-800/60 px-4 py-3 text-emerald-200 transition">ورود با گیت‌هاب</button>
        </div>

        <!-- یادآوری -->
        <div class="text-xs text-emerald-300 text-center">
          برای تست: ایمیل <b dir="ltr" class="text-white">demo@site.com</b> و رمز <b dir="ltr" class="text-white">Demo1234!</b>
        </div>
      </form>
    </div>
  </div>
</template>
