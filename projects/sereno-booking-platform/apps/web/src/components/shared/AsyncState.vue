<script setup lang="ts">
import { AlertCircle, LoaderCircle } from "lucide-vue-next";
defineProps<{
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyText?: string;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="state" role="status">
    <LoaderCircle class="spin" :size="26" />
    <p>Finding a little clarity…</p>
  </div>
  <div v-else-if="error" class="state error" role="alert">
    <AlertCircle />
    <p>{{ error.message }}</p>
    <button class="text-link" @click="$emit('retry')">Try again</button>
  </div>
  <div v-else-if="empty" class="state">
    <p>{{ emptyText || "Nothing here just yet." }}</p>
  </div>
  <slot v-else />
</template>
