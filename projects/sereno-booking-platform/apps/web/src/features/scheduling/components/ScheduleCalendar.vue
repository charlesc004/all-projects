<script setup lang="ts">
import { computed } from "vue";
import type { Appointment } from "../../../lib/api/client";
import { addDays, localDate } from "../../../lib/utils";
import CalendarEvent from "./CalendarEvent.vue";
const props = defineProps<{
  appointments: Appointment[];
  first: string;
  days: number;
  timezone: string;
}>();
defineEmits<{ select: [appointment: Appointment] }>();
const dates = computed(() =>
  Array.from({ length: props.days }, (_, index) => addDays(props.first, index)),
);
const dayEvents = (day: string) =>
  props.appointments
    .filter((a) => localDate(new Date(a.start_at), props.timezone) === day)
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
</script>
<template>
  <div class="schedule-calendar" :style="{ '--days': days }">
    <section v-for="day in dates" :key="day" class="schedule-day">
      <header :class="{ today: day === localDate(new Date(), timezone) }">
        <span>{{
          new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            timeZone: "UTC",
          }).format(new Date(day + "T12:00:00Z"))
        }}</span
        ><strong>{{ Number(day.slice(-2)) }}</strong>
      </header>
      <div class="schedule-day-events">
        <CalendarEvent
          v-for="event in dayEvents(day)"
          :key="event.id"
          :appointment="event"
          :timezone="timezone"
          @select="$emit('select', $event)"
        />
        <p v-if="!dayEvents(day).length" class="calendar-empty">
          A little room to breathe.
        </p>
      </div>
    </section>
  </div>
</template>
