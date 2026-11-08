<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { api, type Appointment, type Schema } from "../../../lib/api/client";
import { useBusiness } from "../../services/api";
import AppointmentCard from "../components/AppointmentCard.vue";
import AppointmentDetail from "../components/AppointmentDetail.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
const business = useBusiness(),
  tab = ref("upcoming"),
  selected = ref<Appointment | null>(null),
  offset = ref(0);
const route = useRoute(),
  router = useRouter();
const linked = useQuery({
  queryKey: computed(() => ["appointments", "linked", route.query.appointment]),
  enabled: computed(() => !!route.query.appointment),
  queryFn: () =>
    api<Appointment>(`/bookings/${Number(route.query.appointment)}`),
});
watch(linked.data, (item) => {
  if (item) selected.value = item;
});
function closeDetail() {
  selected.value = null;
  if (route.query.appointment) router.replace({ query: {} });
}
const query = useQuery({
  queryKey: computed(() => ["appointments", "mine", offset.value]),
  queryFn: () =>
    api<Schema["AppointmentPage"]>(
      `/bookings/me?offset=${offset.value}&limit=50`,
    ),
});
const filtered = computed(() =>
  query.data.value?.items
    .filter((a) =>
      tab.value === "upcoming"
        ? a.status === "confirmed" && new Date(a.end_at).getTime() > Date.now()
        : a.status !== "confirmed" ||
          new Date(a.end_at).getTime() <= Date.now(),
    )
    .sort((a, b) =>
      tab.value === "upcoming"
        ? a.start_at.localeCompare(b.start_at)
        : b.start_at.localeCompare(a.start_at),
    ),
);
</script>
<template>
  <div class="filter-toolbar">
    <h2>Your next <em>good moments.</em></h2>
    <div class="tabs">
      <button :class="{ active: tab === 'upcoming' }" @click="tab = 'upcoming'">
        Upcoming</button
      ><button :class="{ active: tab === 'past' }" @click="tab = 'past'">
        History
      </button>
    </div>
  </div>
  <AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    :empty="!filtered?.length"
    :empty-text="
      tab === 'upcoming'
        ? 'No upcoming moments on this page. A little time for you is just a booking away.'
        : 'Your appointment history will appear here.'
    "
    @retry="query.refetch()"
    ><div class="appointment-list">
      <AppointmentCard
        v-for="item in filtered"
        :key="item.id"
        :appointment="item"
        :timezone="business.data.value?.timezone || 'Europe/London'"
        @detail="selected = $event"
      /></div
  ></AsyncState>
  <div v-if="(query.data.value?.total || 0) > 50" class="pagination">
    <button :disabled="offset === 0" @click="offset -= 50">Previous</button
    ><span>Page {{ offset / 50 + 1 }}</span
    ><button
      :disabled="offset + 50 >= (query.data.value?.total || 0)"
      @click="offset += 50"
    >
      Next
    </button>
  </div>
  <AppointmentDetail
    :appointment="selected"
    :timezone="business.data.value?.timezone || 'Europe/London'"
    :cutoff="business.data.value?.cancellation_hours || 12"
    @close="closeDetail"
  />
</template>
