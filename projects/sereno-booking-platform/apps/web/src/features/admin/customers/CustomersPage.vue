<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Search, ArrowUpRight } from "lucide-vue-next";
import {
  api,
  queryString,
  type Schema,
  type Appointment,
} from "../../../lib/api/client";
import { debounce } from "../../../lib/utils";
import { useBusiness } from "../../services/api";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Dialog from "../../../components/ui/dialog/Dialog.vue";
import Button from "../../../components/ui/button/Button.vue";
import AppointmentCard from "../../appointments/components/AppointmentCard.vue";
import AppointmentDetail from "../../appointments/components/AppointmentDetail.vue";
const business = useBusiness(),
  search = ref(""),
  term = ref(""),
  offset = ref(0),
  selected = ref<Schema["CustomerOut"] | null>(null),
  appointment = ref<Appointment | null>(null);
watch(
  search,
  debounce(() => {
    term.value = search.value;
    offset.value = 0;
  }),
);
const query = useQuery({
  queryKey: computed(() => ["customers", term.value, offset.value]),
  queryFn: () =>
    api<Schema["CustomerPage"]>(
      `/admin/customers?${queryString({ search: term.value, offset: offset.value })}`,
    ),
});
const history = useQuery({
  queryKey: computed(() => ["appointments", "customer", selected.value?.id]),
  enabled: computed(() => !!selected.value),
  queryFn: () =>
    api<Schema["AppointmentPage"]>(
      `/admin/appointments?customer_id=${selected.value!.id}&limit=100`,
    ),
});
</script>
<template>
  <PageHeader
    eyebrow="PEOPLE, NOT JUST APPOINTMENTS"
    title="Your studio community."
    description="A thoughtful view of the people who put their wellbeing in your hands."
  />
  <div class="filter-toolbar">
    <p class="muted">{{ query.data.value?.total || 0 }} customers</p>
    <label class="search-input"
      ><Search :size="17" /><input
        v-model="search"
        placeholder="Search name or email…"
        aria-label="Search customers"
        type="search"
    /></label>
  </div>
  <AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    :empty="!query.data.value?.items.length"
    empty-text="No customers match this search."
    @retry="query.refetch()"
    ><div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Contact</th>
            <th>Appointments</th>
            <th><span class="sr-only">View details</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in query.data.value?.items" :key="customer.id">
            <td>
              <strong>{{ customer.full_name }}</strong
              ><small>Customer #{{ customer.id }}</small>
            </td>
            <td>
              {{ customer.email
              }}<small>{{ customer.phone || "No phone provided" }}</small>
            </td>
            <td>{{ customer.appointment_count }}</td>
            <td>
              <button
                class="round-link"
                :aria-label="`View ${customer.full_name}`"
                @click="selected = customer"
              >
                <ArrowUpRight :size="17" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <button :disabled="offset === 0" @click="offset -= 25">Previous</button
      ><span>Page {{ offset / 25 + 1 }}</span
      ><button
        :disabled="offset + 25 >= (query.data.value?.total || 0)"
        @click="offset += 25"
      >
        Next
      </button>
    </div></AsyncState
  ><Dialog
    :open="!!selected"
    :title="selected?.full_name || 'Customer'"
    :description="selected?.email"
    @update:open="!$event && (selected = null)"
    ><template v-if="selected"
      ><p class="muted">{{ selected.phone }}</p>
      <Button as-child size="sm"
        ><RouterLink :to="`/book?customer=${selected.id}`"
          >Book for this customer <ArrowUpRight :size="16" /></RouterLink
      ></Button>
      <h3 class="times-heading">Appointment history</h3>
      <AsyncState
        :loading="history.isPending.value"
        :error="history.error.value"
        :empty="!history.data.value?.items.length"
        @retry="history.refetch()"
        ><div class="appointment-list">
          <AppointmentCard
            v-for="item in history.data.value?.items"
            :key="item.id"
            :appointment="item"
            :timezone="business.data.value?.timezone || 'Europe/London'"
            @detail="appointment = $event"
          />
        </div>
        <p v-if="(history.data.value?.total || 0) > 100" class="muted">
          Showing the latest 100 appointments.
        </p></AsyncState
      ></template
    ></Dialog
  ><AppointmentDetail
    :appointment="appointment"
    :timezone="business.data.value?.timezone || 'Europe/London'"
    :cutoff="business.data.value?.cancellation_hours || 12"
    @close="appointment = null"
  />
</template>
