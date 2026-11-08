<script setup lang="ts">
import { ref, watch } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { write, type Schema } from "../../../lib/api/client";
import { useBusiness } from "../../services/api";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
const business = useBusiness(),
  cache = useQueryClient(),
  form = ref<Schema["SettingsInput"] | null>(null),
  message = ref("");
watch(
  business.data,
  (data) => {
    if (data) form.value = { ...data };
  },
  { immediate: true },
);
const mutation = useMutation({
  mutationFn: () => write("/admin/settings", "PATCH", form.value),
  onSuccess: async () => {
    message.value = "Studio settings saved.";
    await cache.invalidateQueries();
  },
});
</script>
<template>
  <PageHeader
    eyebrow="THE DETAILS THAT MAKE A DIFFERENCE"
    title="Make the studio yours."
    description="Your business information and booking policies, thoughtfully configured."
  /><AsyncState
    :loading="business.isPending.value"
    :error="business.error.value"
    @retry="business.refetch()"
    ><form v-if="form" @submit.prevent="mutation.mutate()">
      <div class="grid-2 settings-grid">
        <section class="panel">
          <h2>Studio details</h2>
          <label class="field"
            >Business name<input
              v-model="form.name"
              required
              minlength="2"
              maxlength="100" /></label
          ><label class="field"
            >Contact email<input
              v-model="form.email"
              required
              type="email" /></label
          ><label class="field"
            >Phone<input v-model="form.phone" maxlength="40" /></label
          ><label class="field"
            >Address<input v-model="form.address" maxlength="300" /></label
          ><label class="field"
            >Business timezone (IANA)<input
              v-model="form.timezone"
              required
              placeholder="Europe/London"
          /></label>
          <p class="muted">
            Changing timezone keeps appointment instants fixed and rechecks them
            against the new local schedules.
          </p>
        </section>
        <section class="panel">
          <h2>Booking with care</h2>
          <label class="field"
            >Booking horizon (days)<input
              v-model.number="form.horizon_days"
              type="number"
              required
              min="1"
              max="365" /></label
          ><label class="field"
            >Minimum booking notice (minutes)<input
              v-model.number="form.notice_minutes"
              type="number"
              required
              min="0"
              max="10080" /></label
          ><label class="field"
            >Cancellation & rescheduling cutoff (hours)<input
              v-model.number="form.cancellation_hours"
              type="number"
              required
              min="0"
              max="168" /></label
          ><label class="field"
            >Slot interval (minutes)<input
              v-model.number="form.slot_minutes"
              type="number"
              required
              min="5"
              max="120"
          /></label>
          <p class="muted">
            Service buffers are set per treatment. Confirmed appointments keep
            their original duration, price and buffers.
          </p>
        </section>
      </div>
      <p v-if="message" class="success-note" role="status">{{ message }}</p>
      <p v-if="mutation.error.value" class="form-error" role="alert">
        {{ mutation.error.value.message }}
      </p>
      <Button :disabled="mutation.isPending.value">{{
        mutation.isPending.value ? "Saving…" : "Save studio settings"
      }}</Button>
    </form></AsyncState
  >
</template>
