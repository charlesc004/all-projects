<script setup lang="ts">
import { Leaf, Clock3, ShieldCheck } from "lucide-vue-next";
import type { Service, Staff } from "../../../lib/api/client";
import { money, dateLabel, timeLabel } from "../../../lib/utils";
defineProps<{
  service?: Service;
  staff?: Staff;
  slot?: string;
  timezone: string;
  cutoff: number;
}>();
</script>
<template>
  <aside class="booking-summary">
    <div class="summary-art">
      <Leaf :size="28" :stroke-width="1" /><span
        >A LITTLE TIME, ENTIRELY YOURS</span
      >
    </div>
    <div class="summary-content">
      <p class="eyebrow">YOUR MOMENT</p>
      <h3>{{ service?.name || "Something good awaits." }}</h3>
      <p class="muted">
        {{
          staff
            ? `With ${staff.display_name}`
            : "Choose your treatment to begin."
        }}
      </p>
      <div v-if="service" class="summary-row">
        <span><Clock3 :size="15" /> Duration</span
        ><strong>{{ service.duration }} minutes</strong>
      </div>
      <div v-if="slot" class="summary-row">
        <span>When</span
        ><strong
          >{{ dateLabel(slot, timezone) }}<br />{{
            timeLabel(slot, timezone)
          }}</strong
        >
      </div>
      <div v-if="service" class="summary-total">
        <span>Treatment total</span><strong>{{ money(service.price) }}</strong>
      </div>
      <p class="summary-policy">
        <ShieldCheck :size="18" /><span
          >Plans change. Cancel or reschedule up to {{ cutoff }} hours before
          your appointment.<br /><br />Pay at the studio. No payment is taken
          online.</span
        >
      </p>
    </div>
  </aside>
</template>
