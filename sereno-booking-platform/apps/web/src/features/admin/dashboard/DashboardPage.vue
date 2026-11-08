<script setup lang="ts">
import { computed, ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  UsersRound,
  Sparkles,
  Leaf,
} from "lucide-vue-next";
import { api, type Appointment, type Schema } from "../../../lib/api/client";
import { useAuth } from "../../auth/store";
import { useBusiness } from "../../services/api";
import { addDays, localDate, money } from "../../../lib/utils";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
import MetricCard from "./MetricCard.vue";
import AnalyticsChart from "../analytics/AnalyticsChart.vue";
import AppointmentCard from "../../appointments/components/AppointmentCard.vue";
import AppointmentDetail from "../../appointments/components/AppointmentDetail.vue";
const auth = useAuth(),
  business = useBusiness(),
  selected = ref<Appointment | null>(null);
const today = computed(() =>
    localDate(new Date(), business.data.value?.timezone),
  ),
  isAdmin = computed(() => auth.user?.role === "admin");
const analytics = useQuery({
  queryKey: ["analytics"],
  enabled: isAdmin,
  queryFn: () => api<Schema["Analytics"]>("/admin/dashboard"),
});
const appointments = useQuery({
  queryKey: computed(() => ["appointments", "today", today.value]),
  queryFn: () =>
    api<Schema["AppointmentPage"]>(
      `/${isAdmin.value ? "admin" : "staff/me"}/appointments?date_from=${today.value}&date_to=${addDays(today.value, 1)}&limit=100`,
    ),
});
const sorted = computed(() =>
  appointments.data.value?.items
    .slice()
    .sort((a, b) => a.start_at.localeCompare(b.start_at)),
);
</script>
<template>
  <PageHeader
    :eyebrow="
      new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'full',
        timeZone: business.data.value?.timezone || 'Europe/London',
      }).format(new Date())
    "
    :title="`A good day starts here, ${auth.user?.full_name.split(' ')[0]}.`"
    description="A little clarity for your day. Here’s what’s happening at the studio."
    ><Button as-child
      ><RouterLink to="/dashboard/calendar"
        >View calendar
        <ArrowUpRight :size="16" /></RouterLink></Button></PageHeader
  ><AsyncState
    v-if="isAdmin"
    :loading="analytics.isPending.value"
    :error="analytics.error.value"
    @retry="analytics.refetch()"
    ><div v-if="analytics.data.value" class="metrics-grid">
      <MetricCard
        label="Today's appointments"
        :value="analytics.data.value.today"
        note="All statuses · business timezone"
        :icon="CalendarDays"
      /><MetricCard
        label="Upcoming moments"
        :value="analytics.data.value.upcoming"
        note="Confirmed future appointments"
        :icon="Sparkles"
      /><MetricCard
        label="Completed appointments"
        :value="analytics.data.value.completed"
        note="All-time completed sessions"
        :icon="CircleCheck"
      /><MetricCard
        label="Our people"
        :value="analytics.data.value.active_staff"
        :note="`${analytics.data.value.active_services} active services`"
        :icon="UsersRound"
      /></div
  ></AsyncState>
  <div class="dashboard-overview-grid">
    <section class="panel today-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">THE DAY AHEAD</p>
          <h2>Today at the studio</h2>
        </div>
        <span class="count-badge"
          >{{ appointments.data.value?.total || 0 }} appointments</span
        >
      </div>
      <AsyncState
        :loading="appointments.isPending.value"
        :error="appointments.error.value"
        :empty="!sorted?.length"
        empty-text="A quiet day ahead. Your next appointments will appear here."
        @retry="appointments.refetch()"
        ><div class="appointment-list">
          <AppointmentCard
            v-for="item in sorted?.slice(0, 6)"
            :key="item.id"
            :appointment="item"
            :timezone="business.data.value?.timezone || 'Europe/London'"
            team
            @detail="selected = $event"
          />
        </div>
        <RouterLink to="/dashboard/calendar" class="text-link panel-footer-link"
          >See the full calendar <ArrowUpRight :size="16" /></RouterLink
      ></AsyncState>
    </section>
    <div class="overview-right">
      <section class="studio-note">
        <Leaf :size="23" :stroke-width="1.2" />
        <p class="eyebrow">A LITTLE REMINDER</p>
        <h2>Good care starts<br /><em>with a little space.</em></h2>
        <p>
          Keep your schedule considered, your team supported, and your customers
          cared for.
        </p>
        <RouterLink to="/dashboard/schedules" class="text-link"
          >Make room for good work <ArrowUpRight :size="16"
        /></RouterLink>
      </section>
      <section v-if="analytics.data.value" class="panel">
        <div class="panel-heading">
          <h3>Popular treatments</h3>
          <Sparkles :size="17" />
        </div>
        <div
          v-for="(item, i) in [...analytics.data.value.by_service]
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)"
          :key="item.label"
          class="popular-row"
        >
          <span class="popular-number">0{{ i + 1 }}</span>
          <div>
            {{ item.label
            }}<small>{{ item.count }} appointments · all time</small>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div v-if="analytics.data.value" class="grid-2 dashboard-charts">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Appointment rhythm</h3>
          <p class="muted">Appointments by scheduled date · last 14 days</p>
        </div>
        <span class="tag">All statuses</span>
      </div>
      <AnalyticsChart
        :data="analytics.data.value.daily"
        label="Appointments"
        line
      />
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>A little perspective</h3>
          <p class="muted">Actual studio activity, thoughtfully measured</p>
        </div>
      </div>
      <div class="insight-row">
        <span
          >Completion rate
          <small>Completed ÷ (completed + no-show)</small></span
        ><strong>{{ analytics.data.value.completion_rate }}%</strong>
      </div>
      <div class="insight-row">
        <span>Cancelled appointments <small>All-time cancellations</small></span
        ><strong>{{ analytics.data.value.cancelled }}</strong>
      </div>
      <div class="insight-row">
        <span
          >Estimated booking value
          <small>Confirmed + completed · no payments processed</small></span
        ><strong>{{ money(analytics.data.value.estimated_value) }}</strong>
      </div>
    </section>
  </div>
  <AppointmentDetail
    :appointment="selected"
    :timezone="business.data.value?.timezone || 'Europe/London'"
    :cutoff="business.data.value?.cancellation_hours || 12"
    @close="selected = null"
  />
</template>
