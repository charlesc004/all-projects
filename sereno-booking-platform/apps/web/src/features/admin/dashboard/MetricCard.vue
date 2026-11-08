<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next";
defineProps<{
  label: string;
  value: string | number;
  note: string;
  icon: object;
}>();
</script>
<template>
  <article class="metric-card">
    <div>
      <span>{{ label }}</span
      ><component :is="icon" :size="18" />
    </div>
    <strong>{{ value }}</strong
    ><small><ArrowUpRight :size="13" />{{ note }}</small>
  </article>
</template>
