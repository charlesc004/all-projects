<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  api,
  write,
  type Appointment,
  type Schema,
} from "../../../lib/api/client";
import { useAuth } from "../../auth/store";
import Dialog from "../../../components/ui/dialog/Dialog.vue";
import Button from "../../../components/ui/button/Button.vue";
import StatusBadge from "../../../components/shared/StatusBadge.vue";
import { dateLabel, timeLabel, money } from "../../../lib/utils";
const props = defineProps<{
  appointment: Appointment | null;
  timezone: string;
  cutoff: number;
}>();
const emit = defineEmits<{ close: [] }>();
const auth = useAuth(),
  cache = useQueryClient(),
  reason = ref(""),
  cancelling = ref(false);
const history = useQuery({
  queryKey: computed(() => ["appointment-activity", props.appointment?.id]),
  enabled: computed(() => !!props.appointment),
  queryFn: () =>
    api<Schema["ActivityOut"][]>(`/bookings/${props.appointment!.id}/activity`),
});
const canChange = computed(
  () =>
    props.appointment?.status === "confirmed" &&
    new Date(props.appointment.start_at).getTime() >
      Date.now() + (auth.user?.role === "admin" ? 0 : props.cutoff * 3600000) &&
    auth.user?.role !== "staff",
);
const canComplete = computed(
  () =>
    props.appointment?.status === "confirmed" &&
    new Date(props.appointment.end_at).getTime() <= Date.now() &&
    auth.user?.role !== "customer",
);
const mutation = useMutation({
  mutationFn: (action: "cancel" | "completed" | "no_show") =>
    action === "cancel"
      ? write(`/bookings/${props.appointment!.id}/cancel`, "POST", {
          reason: reason.value,
        })
      : write(
          `/staff/me/appointments/${props.appointment!.id}/status`,
          "PATCH",
          { status: action },
        ),
  onSuccess: async () => {
    await cache.invalidateQueries();
    emit("close");
  },
});
watch(
  () => props.appointment?.id,
  () => {
    cancelling.value = false;
    reason.value = "";
    mutation.reset();
  },
);
</script>
<template>
  <Dialog
    :open="!!appointment"
    title="Your appointment"
    :description="`Appointment #${appointment?.id || ''}`"
    @update:open="!$event && emit('close')"
    ><template v-if="appointment"
      ><div class="detail-heading">
        <h2>{{ appointment.service_name }}</h2>
        <StatusBadge :status="appointment.status" />
      </div>
      <dl class="detail-list">
        <div>
          <dt>Professional</dt>
          <dd>{{ appointment.staff_name }}</dd>
        </div>
        <div v-if="auth.user?.role !== 'customer'">
          <dt>Customer</dt>
          <dd>{{ appointment.customer_name }}</dd>
        </div>
        <div>
          <dt>Date & time</dt>
          <dd>
            {{ dateLabel(appointment.start_at, timezone) }}<br />{{
              timeLabel(appointment.start_at, timezone)
            }}
          </dd>
        </div>
        <div>
          <dt>Duration & price</dt>
          <dd>
            {{ appointment.duration }} min · {{ money(appointment.price) }}
          </dd>
        </div>
        <div v-if="appointment.notes">
          <dt>Notes</dt>
          <dd>{{ appointment.notes }}</dd>
        </div>
        <div v-if="appointment.cancellation_reason">
          <dt>Cancellation reason</dt>
          <dd>{{ appointment.cancellation_reason }}</dd>
        </div>
      </dl>
      <div v-if="canChange" class="dialog-actions">
        <Button as-child variant="outline"
          ><RouterLink
            :to="`/book?reschedule=${appointment.id}&service=${appointment.service_id}&staff=${appointment.staff_id}`"
            @click="emit('close')"
            >Reschedule</RouterLink
          ></Button
        ><Button variant="ghost" @click="cancelling = !cancelling"
          >Cancel appointment</Button
        >
      </div>
      <form
        v-if="cancelling"
        class="cancel-form"
        @submit.prevent="mutation.mutate('cancel')"
      >
        <label class="field"
          >Reason <span class="muted">(optional)</span
          ><textarea v-model="reason" maxlength="500" rows="2" />
        </label>
        <p class="muted">
          This will cancel your appointment and release the time.
        </p>
        <Button variant="danger" :disabled="mutation.isPending.value"
          >Confirm cancellation</Button
        >
      </form>
      <div v-if="canComplete" class="dialog-actions">
        <Button
          :disabled="mutation.isPending.value"
          @click="mutation.mutate('completed')"
          >Mark completed</Button
        ><Button
          variant="outline"
          :disabled="mutation.isPending.value"
          @click="mutation.mutate('no_show')"
          >Mark no-show</Button
        >
      </div>
      <p v-if="mutation.error.value" class="form-error" role="alert">
        {{ mutation.error.value.message }}
      </p>
      <div class="activity-history">
        <h4>Appointment history</h4>
        <p v-for="event in history.data.value" :key="event.id">
          <span class="activity-dot" /><span>{{
            event.event.replace("_", " ")
          }}</span
          ><small>{{ dateLabel(event.created_at, timezone) }}</small>
        </p>
      </div></template
    ></Dialog
  >
</template>
