<script setup lang="ts">
import { timeLabel } from "../../../lib/utils";
defineProps<{ slots: string[]; selected: string; timezone: string }>();
defineEmits<{ select: [slot: string] }>();
</script>
<template>
  <div class="time-slots">
    <button
      v-for="slot in slots"
      :key="slot"
      :class="{ selected: selected === slot }"
      :aria-pressed="selected === slot"
      @click="$emit('select', slot)"
    >
      {{ timeLabel(slot, timezone) }}
    </button>
    <p v-if="!slots.length" class="muted">
      No available times for this date. Choose another day.
    </p>
  </div>
</template>
