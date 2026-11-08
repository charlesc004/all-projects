<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">داشبورد</h1>
        <button
          @click="logout()"
          class="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg transition"
        >
          خروج
        </button>
      </div>

      <div class="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-2xl p-6">
        <h2 class="text-xl font-semibold mb-4">خوش آمدید!</h2>
        <div class="space-y-2 text-slate-300">
          <p><strong>نام:</strong> {{ user?.name }}</p>
          <p><strong>ایمیل:</strong> {{ user?.email }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

