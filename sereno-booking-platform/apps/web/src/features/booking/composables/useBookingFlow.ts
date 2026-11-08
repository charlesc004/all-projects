import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  api,
  write,
  queryString,
  type Appointment,
  type Schema,
} from "../../../lib/api/client";
import { useServices, useStaff, useBusiness } from "../../services/api";
import { useAuth } from "../../auth/store";
import { localDate } from "../../../lib/utils";

export function useBookingFlow() {
  const route = useRoute(),
    router = useRouter(),
    auth = useAuth(),
    cache = useQueryClient();
  const services = useServices(),
    staff = useStaff(),
    business = useBusiness();
  const serviceId = ref(Number(route.query.service) || 0),
    staffId = ref(Number(route.query.staff) || 0);
  const selectedDate = ref(String(route.query.date || "")),
    slot = ref(String(route.query.slot || "")),
    notes = ref("");
  const month = ref((selectedDate.value || localDate(new Date())).slice(0, 7));
  const step = ref(route.query.slot ? 3 : route.query.reschedule ? 2 : 0);
  const confirmation = ref<Appointment | null>(null);
  const original = useQuery({
    queryKey: computed(() => [
      "appointments",
      "reschedule",
      route.query.reschedule,
    ]),
    enabled: computed(() => !!route.query.reschedule),
    queryFn: () =>
      api<Appointment>(`/bookings/${Number(route.query.reschedule)}`),
  });
  watch(original.data, (item) => {
    if (item) {
      serviceId.value = item.service_id;
      staffId.value = item.staff_id;
    }
  });
  const service = computed(() => {
    const item = services.data.value?.find((s) => s.id === serviceId.value);
    return item && original.data.value
      ? {
          ...item,
          duration: original.data.value.duration,
          price: original.data.value.price,
        }
      : item;
  });
  const person = computed(() =>
    staff.data.value?.find((s) => s.id === staffId.value),
  );
  const eligible = computed(() =>
    staff.data.value?.filter((s) => s.service_ids.includes(serviceId.value)),
  );
  const dates = useQuery({
    queryKey: computed(() => [
      "available-dates",
      serviceId.value,
      staffId.value,
      month.value,
      route.query.reschedule,
    ]),
    enabled: computed(
      () => !!serviceId.value && !!staffId.value && step.value >= 2,
    ),
    queryFn: () =>
      api<Schema["DateAvailability"][]>(
        `${route.query.reschedule ? `/bookings/${Number(route.query.reschedule)}/available-dates` : "/availability/dates"}?${queryString({ service_id: serviceId.value, staff_id: staffId.value, date_from: `${month.value}-01`, days: new Date(Number(month.value.slice(0, 4)), Number(month.value.slice(5)), 0).getDate() })}`,
      ),
    staleTime: 0,
  });
  const slots = useQuery({
    queryKey: computed(() => [
      "slots",
      serviceId.value,
      staffId.value,
      selectedDate.value,
      route.query.reschedule,
    ]),
    enabled: computed(
      () =>
        !!serviceId.value &&
        !!staffId.value &&
        !!selectedDate.value &&
        step.value >= 2,
    ),
    queryFn: () =>
      api<Schema["Slots"]>(
        `${route.query.reschedule ? `/bookings/${Number(route.query.reschedule)}/availability` : "/availability"}?${queryString({ service_id: serviceId.value, staff_id: staffId.value, date: selectedDate.value })}`,
      ),
    staleTime: 0,
  });
  function selectService(id: number) {
    serviceId.value = id;
    if (!eligible.value?.some((s) => s.id === staffId.value)) staffId.value = 0;
    slot.value = "";
    selectedDate.value = "";
    step.value = 1;
  }
  function selectStaff(id: number) {
    staffId.value = id;
    selectedDate.value = "";
    slot.value = "";
    step.value = 2;
  }
  function selectDate(day: string) {
    selectedDate.value = day;
    slot.value = "";
  }
  watch([serviceId, staffId, selectedDate, slot], () =>
    router.replace({
      query: {
        ...route.query,
        service: serviceId.value || undefined,
        staff: staffId.value || undefined,
        date: selectedDate.value || undefined,
        slot: slot.value || undefined,
      },
    }),
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (!auth.user) {
        await router.push({
          path: "/login",
          query: { redirect: route.fullPath },
        });
        return null;
      }
      if (route.query.reschedule)
        return write<Appointment>(
          `/bookings/${Number(route.query.reschedule)}/reschedule`,
          "POST",
          { start_at: slot.value },
        );
      return write<Appointment>("/bookings", "POST", {
        service_id: serviceId.value,
        staff_id: staffId.value,
        start_at: slot.value,
        notes: notes.value,
        customer_id: route.query.customer
          ? Number(route.query.customer)
          : undefined,
      });
    },
    onSuccess: async (item) => {
      if (item) {
        confirmation.value = item;
        await cache.invalidateQueries({
          predicate: (query) =>
            [
              "appointments",
              "slots",
              "available-dates",
              "analytics",
              "notifications",
            ].includes(String(query.queryKey[0])),
        });
      }
    },
    onError: async () => {
      await slots.refetch();
      await dates.refetch();
    },
  });
  return {
    services,
    staff,
    business,
    serviceId,
    staffId,
    service,
    person,
    eligible,
    selectedDate,
    slot,
    notes,
    month,
    step,
    confirmation,
    dates,
    slots,
    mutation,
    selectService,
    selectStaff,
    selectDate,
    auth,
  };
}
