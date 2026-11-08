<script setup lang="ts">
import type { Appointment } from "../../../lib/api/client";
import { timeLabel } from "../../../lib/utils";
defineProps<{ appointment: Appointment; timezone: string }>();
defineEmits<{ select: [appointment: Appointment] }>();
</script>
<template>
  <button
    class="calendar-event"
    :class="appointment.status"
    @click="$emit('select', appointment)"
  >
    <small>{{ timeLabel(appointment.start_at, timezone) }}</small
    ><strong>{{ appointment.service_name }}</strong
    ><span>{{ appointment.customer_name }}</span
    ><small
      >{{ appointment.staff_name }} ·
      {{ appointment.status.replace("_", " ") }}</small
    >
  </button>
</template>
