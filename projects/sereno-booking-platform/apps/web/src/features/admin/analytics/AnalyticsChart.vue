<script setup lang="ts">
import { computed } from "vue";
import { Bar, Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import type { Schema } from "../../../lib/api/client";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);
const props = defineProps<{
  data: Schema["Metric"][];
  label: string;
  line?: boolean;
}>();
const chartData = computed(() => ({
  labels: props.data.map((d) => d.label),
  datasets: [
    {
      label: props.label,
      data: props.data.map((d) => d.count),
      backgroundColor: props.line
        ? "rgba(110,96,158,.12)"
        : ["#7763a3", "#a99ac9", "#cc9db6", "#788bb7", "#c0add5"],
      borderColor: "#7763a3",
      borderWidth: props.line ? 2 : 0,
      borderRadius: 5,
      pointRadius: 3,
      tension: 0.4,
      fill: true,
    },
  ],
}));
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#626782", font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: "#eeebf5" },
      ticks: { precision: 0, color: "#626782", font: { size: 10 } },
    },
  },
};
</script>
<template>
  <div class="chart-container">
    <Line
      v-if="line"
      :data="chartData"
      :options="options"
      :aria-label="`${label}: ${data.map((d) => `${d.label}, ${d.count}`).join('; ')}`"
    /><Bar
      v-else
      :data="chartData"
      :options="options"
      :aria-label="`${label}: ${data.map((d) => `${d.label}, ${d.count}`).join('; ')}`"
    />
  </div>
</template>
