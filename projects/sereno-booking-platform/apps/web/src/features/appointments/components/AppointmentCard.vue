<script setup lang="ts">
import {
  CalendarDays,
  Clock3,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-vue-next";
import type { Appointment } from "../../../lib/api/client";
import { dateLabel, timeLabel, money } from "../../../lib/utils";
import StatusBadge from "../../../components/shared/StatusBadge.vue";
defineProps<{ appointment: Appointment; timezone: string; team?: boolean }>();
defineEmits<{ detail: [appointment: Appointment] }>();
</script>
<template>
  <article class="appointment-card">
    <div class="appointment-icon">
      <CalendarDays :size="24" :stroke-width="1.4" />
    </div>
    <div class="appointment-info">
      <div class="appointment-title">
        <h3>{{ appointment.service_name }}</h3>
        <StatusBadge :status="appointment.status" />
      </div>
      <p>
        {{ team ? appointment.customer_name + " · " : "" }}With
        {{ appointment.staff_name }}
      </p>
      <div class="appointment-meta">
        <span
          ><CalendarDays :size="13" />{{
            dateLabel(appointment.start_at, timezone)
          }}</span
        ><span
          ><Clock3 :size="13" />{{
            timeLabel(appointment.start_at, timezone)
          }}
          · {{ appointment.duration }} min</span
        >
      </div>
    </div>
    <strong class="appointment-price">{{ money(appointment.price) }}</strong
    ><button
      class="round-link"
      :aria-label="`View appointment ${appointment.id}`"
      @click="$emit('detail', appointment)"
    >
      <component
        :is="appointment.status === 'confirmed' ? ArrowUpRight : MoreHorizontal"
        :size="19"
      />
    </button>
  </article>
</template>
