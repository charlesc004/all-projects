<script setup lang="ts">
import { Check } from "lucide-vue-next";
defineProps<{ step: number; minimumStep?: number }>();
defineEmits<{ go: [step: number] }>();
const labels = ["Treatment", "Professional", "Date & time", "Review"];
</script>
<template>
  <ol class="booking-stepper">
    <li
      v-for="(label, index) in labels"
      :key="label"
      :class="{ active: index === step, done: index < step }"
    >
      <button
        :disabled="index > step || index < (minimumStep || 0)"
        :aria-current="index === step ? 'step' : undefined"
        @click="$emit('go', index)"
      >
        <span
          ><Check v-if="index < step" :size="14" /><template v-else>{{
            index + 1
          }}</template></span
        >{{ label }}
      </button>
    </li>
  </ol>
</template>
