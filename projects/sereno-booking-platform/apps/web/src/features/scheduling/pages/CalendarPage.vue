<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import {
  api,
  queryString,
  type Appointment,
  type Schema,
} from "../../../lib/api/client";
import { useAuth } from "../../auth/store";
import { useBusiness, useStaff } from "../../services/api";
import { addDays, localDate } from "../../../lib/utils";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import ScheduleCalendar from "../components/ScheduleCalendar.vue";
import AppointmentDetail from "../../appointments/components/AppointmentDetail.vue";
const route = useRoute(),
  router = useRouter(),
  auth = useAuth(),
  business = useBusiness(),
  staff = useStaff();
const date = ref(String(route.query.date || localDate(new Date()))),
  view = ref("week"),
  staffId = ref(""),
  status = ref(""),
  offset = ref(0),
  selected = ref<Appointment | null>(null);
const days = computed(() => (view.value === "week" ? 7 : 1));
const query = useQuery({
  queryKey: computed(() => [
    "appointments",
    "calendar",
    date.value,
    days.value,
    staffId.value,
    status.value,
    offset.value,
  ]),
  queryFn: () =>
    api<Schema["AppointmentPage"]>(
      `/${auth.user?.role === "admin" ? "admin" : "staff/me"}/appointments?${queryString({ date_from: date.value, date_to: addDays(date.value, days.value), staff_id: staffId.value, status: status.value, limit: 100, offset: offset.value })}`,
    ),
});
watch([date, view, staffId, status], () => {
  offset.value = 0;
  router.replace({ query: { date: date.value } });
});
const linked = useQuery({
  queryKey: computed(() => ["appointments", "linked", route.query.appointment]),
  enabled: computed(() => !!route.query.appointment),
  queryFn: () =>
    api<Appointment>(`/bookings/${Number(route.query.appointment)}`),
});
watch(linked.data, (item) => {
  if (item) {
    selected.value = item;
    date.value = localDate(
      new Date(item.start_at),
      business.data.value?.timezone,
    );
  }
});
function closeDetail() {
  selected.value = null;
  if (route.query.appointment) router.replace({ query: { date: date.value } });
}
</script>
<template>
  <PageHeader
    eyebrow="MAKE ROOM FOR GOOD CARE"
    title="A considered calendar."
    description="Every person, every appointment, a little more organised."
  />
  <div class="calendar-toolbar">
    <div>
      <button
        class="icon-button"
        aria-label="Previous period"
        @click="date = addDays(date, -days)"
      >
        <ChevronLeft :size="19" /></button
      ><input
        v-model="date"
        type="date"
        aria-label="Calendar start date"
      /><button
        class="icon-button"
        aria-label="Next period"
        @click="date = addDays(date, days)"
      >
        <ChevronRight :size="19" /></button
      ><button
        class="text-link"
        @click="date = localDate(new Date(), business.data.value?.timezone)"
      >
        Today
      </button>
    </div>
    <div>
      <select
        v-if="auth.user?.role === 'admin'"
        v-model="staffId"
        aria-label="Filter professionals"
      >
        <option value="">All professionals</option>
        <option
          v-for="person in staff.data.value"
          :key="person.id"
          :value="person.id"
        >
          {{ person.display_name }}
        </option></select
      ><select v-model="status" aria-label="Filter status">
        <option value="">All statuses</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
        <option value="no_show">No-show</option>
      </select>
      <div class="tabs">
        <button :class="{ active: view === 'day' }" @click="view = 'day'">
          Day</button
        ><button :class="{ active: view === 'week' }" @click="view = 'week'">
          Week
        </button>
      </div>
    </div>
  </div>
  <p class="muted calendar-timezone">
    {{ business.data.value?.timezone }} ·
    {{ query.data.value?.total || 0 }} appointments
  </p>
  <AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    @retry="query.refetch()"
    ><ScheduleCalendar
      :appointments="query.data.value?.items || []"
      :first="date"
      :days="days"
      :timezone="business.data.value?.timezone || 'Europe/London'"
      @select="selected = $event"
  /></AsyncState>
  <div v-if="(query.data.value?.total || 0) > 100" class="pagination">
    <button :disabled="offset === 0" @click="offset -= 100">Previous 100</button
    ><span>Page {{ offset / 100 + 1 }}</span
    ><button
      :disabled="offset + 100 >= (query.data.value?.total || 0)"
      @click="offset += 100"
    >
      Next 100
    </button>
  </div>
  <AppointmentDetail
    :appointment="selected"
    :timezone="business.data.value?.timezone || 'Europe/London'"
    :cutoff="business.data.value?.cancellation_hours || 12"
    @close="closeDetail"
  />
</template>
