<script setup lang="ts">
import { ref, watch } from "vue";
import { Plus, Trash2 } from "lucide-vue-next";
import type { Schema } from "../../../lib/api/client";
import Button from "../../../components/ui/button/Button.vue";
const props = defineProps<{
  hours: Schema["HoursInput"][];
  readonly?: boolean;
  pending?: boolean;
}>();
const emit = defineEmits<{ save: [hours: Schema["HoursInput"][]] }>();
const form = ref<Schema["HoursInput"][]>([]);
watch(
  () => props.hours,
  (hours) => {
    form.value = hours.map((h) => ({
      weekday: h.weekday,
      start: h.start.slice(0, 5),
      end: h.end.slice(0, 5),
    }));
  },
  { immediate: true },
);
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
</script>
<template>
  <form class="hours-editor" @submit.prevent="emit('save', form)">
    <div v-for="(day, weekday) in days" :key="day" class="hours-day">
      <strong>{{ day }}</strong>
      <div>
        <p v-if="!form.some((h) => h.weekday === weekday)" class="muted">
          A day to recharge
        </p>
        <div
          v-for="hour in form.filter((h) => h.weekday === weekday)"
          :key="form.indexOf(hour)"
          class="hours-interval"
        >
          <input
            v-model="hour.start"
            type="time"
            required
            :disabled="readonly"
            :aria-label="`${day} start`"
          /><span>to</span
          ><input
            v-model="hour.end"
            type="time"
            required
            :disabled="readonly"
            :aria-label="`${day} end`"
          /><button
            v-if="!readonly"
            type="button"
            class="icon-button"
            :aria-label="`Remove ${day} interval`"
            @click="form.splice(form.indexOf(hour), 1)"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
      <button
        v-if="!readonly"
        type="button"
        class="icon-button"
        :aria-label="`Add ${day} interval`"
        @click="form.push({ weekday, start: '09:00', end: '17:00' })"
      >
        <Plus :size="17" />
      </button>
    </div>
    <Button v-if="!readonly" :disabled="pending">{{
      pending ? "Saving…" : "Save working hours"
    }}</Button>
  </form>
</template>
