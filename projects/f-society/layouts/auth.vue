<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div class="absolute inset-0 pointer-events-none">
        <!-- نقطه‌های ظریف پس‌زمینه -->
        <div class="w-full h-full opacity-10 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]"></div>
      </div>
  
      <div class="relative flex items-center justify-center min-h-screen px-4">
        <slot />
      </div>
    </div>
  </template>
  