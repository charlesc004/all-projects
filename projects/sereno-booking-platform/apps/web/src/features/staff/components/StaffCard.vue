<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next";
import type { Staff } from "../../../lib/api/client";
defineProps<{ staff: Staff; selectable?: boolean; selected?: boolean }>();
defineEmits<{ select: [id: number] }>();
</script>
<template>
  <article class="staff-card" :class="{ selected }">
    <div class="portrait">
      <img
        :src="staff.image || '/images/olivia.svg'"
        :alt="`Illustration of ${staff.display_name}`"
        loading="lazy"
      /><span class="portrait-mark">s.</span>
    </div>
    <div class="staff-details">
      <div>
        <h3>{{ staff.display_name }}</h3>
        <p>{{ staff.title }}</p>
      </div>
      <button
        v-if="selectable"
        class="round-link"
        :aria-label="`Select ${staff.display_name}`"
        @click="$emit('select', staff.id)"
      >
        <ArrowUpRight :size="20" /></button
      ><RouterLink
        v-else
        :to="`/book?staff=${staff.id}`"
        class="round-link"
        :aria-label="`Book with ${staff.display_name}`"
        ><ArrowUpRight :size="20"
      /></RouterLink>
    </div>
    <p class="staff-bio">{{ staff.bio }}</p>
  </article>
</template>
