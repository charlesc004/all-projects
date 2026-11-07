<script setup lang="ts">
const token = useCookie<string | null>('token').value

if (token) {
  navigateTo('/dashboard')
} else {
  navigateTo('/login')
}
</script>

<template>
  <div></div>
</template>

