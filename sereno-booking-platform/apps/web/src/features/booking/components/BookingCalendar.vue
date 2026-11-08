<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import type { Schema } from "../../../lib/api/client";
defineProps<{
  month: string;
  selected: string;
  dates: Schema["DateAvailability"][];
  loading?: boolean;
}>();
const emit = defineEmits<{ select: [day: string]; month: [month: string] }>();
</script>
<script lang="ts">
export const monthTitle = (month: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
export const monthPadding = (month: string) =>
  (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
export function adjacentMonth(month: string, direction: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 7);
}
</script>
<template>
  <div class="booking-calendar">
    <div class="calendar-month">
      <button
        class="icon-button"
        aria-label="Previous month"
        @click="emit('month', adjacentMonth(month, -1))"
      >
        <ChevronLeft :size="18" />
      </button>
      <h3>{{ monthTitle(month) }}</h3>
      <button
        class="icon-button"
        aria-label="Next month"
        @click="emit('month', adjacentMonth(month, 1))"
      >
        <ChevronRight :size="18" />
      </button>
    </div>
    <div class="calendar-grid">
      <span
        v-for="(d, i) in ['M', 'T', 'W', 'T', 'F', 'S', 'S']"
        :key="i"
        class="weekday"
        >{{ d }}</span
      ><span v-for="n in monthPadding(month)" :key="`pad${n}`" /><button
        v-for="day in dates"
        :key="day.date"
        :disabled="day.status !== 'available' || loading"
        :class="[day.status, { selected: day.date === selected }]"
        :aria-label="`${day.date}, ${day.status.replace('_', ' ')}`"
        :aria-pressed="day.date === selected"
        @click="emit('select', day.date)"
      >
        {{ Number(day.date.slice(-2)) }}<i v-if="day.status === 'available'" />
      </button>
    </div>
    <div class="calendar-legend">
      <span><i /> Available</span><span><i class="full" /> Fully booked</span
      ><span><i class="closed" /> Unavailable</span>
    </div>
  </div>
</template>
