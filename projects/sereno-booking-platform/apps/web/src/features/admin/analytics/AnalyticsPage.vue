<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { api, type Schema } from "../../../lib/api/client";
import AnalyticsChart from "./AnalyticsChart.vue";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
const query = useQuery({
  queryKey: ["analytics"],
  queryFn: () => api<Schema["Analytics"]>("/admin/analytics"),
});
</script>
<template>
  <PageHeader
    eyebrow="A LITTLE PERSPECTIVE"
    title="Understand your studio."
    description="Thoughtful insights drawn from your actual appointment activity."
  /><AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    @retry="query.refetch()"
    ><div v-if="query.data.value" class="grid-2 analytics-grid">
      <section class="panel">
        <h3>Appointments over time</h3>
        <p class="muted">Scheduled dates · last 14 days · all statuses</p>
        <AnalyticsChart
          :data="query.data.value.daily"
          label="Appointments"
          line
        />
      </section>
      <section class="panel">
        <h3>Care people come back for</h3>
        <p class="muted">Appointments by service · all time · all statuses</p>
        <AnalyticsChart :data="query.data.value.by_service" label="Bookings" />
      </section>
      <section class="panel">
        <h3>Your people, in perspective</h3>
        <p class="muted">Appointments by professional · all time</p>
        <AnalyticsChart
          :data="query.data.value.by_staff"
          label="Appointments"
        />
      </section>
      <section class="panel">
        <h3>A healthy balance</h3>
        <p class="muted">
          Confirmed blocking minutes ÷ available minutes · next 7 days
        </p>
        <AnalyticsChart
          :data="query.data.value.utilization"
          label="Utilization %"
        />
      </section>
      <section class="panel">
        <h3>When plans change</h3>
        <p class="muted">
          Cancelled appointments by scheduled date · last 14 days
        </p>
        <AnalyticsChart
          :data="query.data.value.cancellations"
          label="Cancellations"
          line
        />
      </section>
      <section class="panel completion-panel">
        <p class="eyebrow">COMPLETION RATE</p>
        <strong>{{ query.data.value.completion_rate }}<em>%</em></strong>
        <p>Completed ÷ (completed + no-show), all time.</p>
        <small class="muted"
          >Cancelled and upcoming appointments are excluded.</small
        >
      </section>
    </div></AsyncState
  >
</template>
