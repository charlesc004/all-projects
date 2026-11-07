<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus, Trash2, Pencil } from "lucide-vue-next";
import { api, write, type Schema } from "../../../lib/api/client";
import { useAuth } from "../../auth/store";
import { useStaff, useBusiness, useServices } from "../../services/api";
import { localDate } from "../../../lib/utils";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
import Dialog from "../../../components/ui/dialog/Dialog.vue";
import WorkingHoursEditor from "../components/WorkingHoursEditor.vue";
const route = useRoute(),
  auth = useAuth(),
  cache = useQueryClient(),
  staff = useStaff(),
  business = useBusiness(),
  services = useServices();
const isAdmin = computed(() => auth.user?.role === "admin"),
  selected = ref(
    String(route.query.staff || (isAdmin.value ? "studio" : "me")),
  ),
  open = ref(false),
  editId = ref<number | null>(null),
  message = ref("");
const myProfile = useQuery({
  queryKey: ["staff-profile"],
  enabled: computed(() => !isAdmin.value),
  queryFn: () => api<Record<string, number>>("/staff/me/profile"),
});
const hoursPath = computed(() =>
  selected.value === "studio"
    ? "/admin/working-hours"
    : isAdmin.value
      ? `/admin/staff/${selected.value}/working-hours`
      : "/staff/me/working-hours",
);
const exceptionsPath = computed(() =>
  isAdmin.value
    ? `/admin/staff/${selected.value}/schedule-exceptions`
    : "/staff/me/schedule-exceptions",
);
const hours = useQuery({
  queryKey: computed(() => ["hours", hoursPath.value]),
  queryFn: () => api<Schema["HoursOut"][]>(hoursPath.value),
});
const exceptions = useQuery({
  queryKey: computed(() => ["exceptions", exceptionsPath.value]),
  enabled: computed(() => selected.value !== "studio"),
  queryFn: () => api<Schema["ExceptionOut"][]>(exceptionsPath.value),
});
const form = ref<Schema["ExceptionInput"]>({
  date_from: localDate(new Date()),
  date_to: localDate(new Date()),
  kind: "closed",
  start: null,
  end: null,
  reason: "",
});
const hoursMutation = useMutation({
  mutationFn: (data: Schema["HoursInput"][]) =>
    write(hoursPath.value, "PUT", data),
  onSuccess: async () => {
    message.value =
      "Working hours updated. Availability now reflects this schedule.";
    await cache.invalidateQueries();
  },
});
const exceptionMutation = useMutation({
  mutationFn: () =>
    write(
      editId.value
        ? `/schedule-exceptions/${editId.value}`
        : exceptionsPath.value,
      editId.value ? "PATCH" : "POST",
      {
        ...form.value,
        start: form.value.start || null,
        end: form.value.end || null,
      },
    ),
  onSuccess: async () => {
    open.value = false;
    await cache.invalidateQueries();
  },
});
const remove = useMutation({
  mutationFn: (id: number) => write(`/schedule-exceptions/${id}`, "DELETE"),
  onSuccess: () => cache.invalidateQueries(),
});
watch(selected, () => {
  message.value = "";
  hoursMutation.reset();
});
</script>
<template>
  <PageHeader
    eyebrow="ROOM FOR GOOD WORK"
    title="A balanced schedule."
    :description="`Manage working hours and time away. All times are local to ${business.data.value?.timezone || 'the studio'}.`"
    ><select v-if="isAdmin" v-model="selected" aria-label="Select schedule">
      <option value="studio">Studio opening hours</option>
      <option
        v-for="person in staff.data.value"
        :key="person.id"
        :value="String(person.id)"
      >
        {{ person.display_name }}
      </option>
    </select></PageHeader
  >
  <div class="schedules-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>
            {{
              selected === "studio"
                ? "Studio opening hours"
                : "Weekly working hours"
            }}
          </h3>
          <p class="muted">
            {{
              isAdmin
                ? "Add multiple intervals to allow for breaks."
                : "Your recurring hours, managed by your administrator."
            }}
          </p>
        </div>
      </div>
      <AsyncState
        :loading="hours.isPending.value"
        :error="hours.error.value"
        @retry="hours.refetch()"
        ><WorkingHoursEditor
          :hours="hours.data.value || []"
          :readonly="!isAdmin"
          :pending="hoursMutation.isPending.value"
          @save="hoursMutation.mutate($event)"
      /></AsyncState>
      <p v-if="message" class="success-note" role="status">{{ message }}</p>
      <p v-if="hoursMutation.error.value" class="form-error" role="alert">
        {{ hoursMutation.error.value.message }}
      </p>
    </section>
    <div>
      <section v-if="selected !== 'studio'" class="panel">
        <div class="panel-heading">
          <div>
            <h3>Time off & exceptions</h3>
            <p class="muted">Make space when you need it.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            @click="
              exceptionMutation.reset();
              editId = null;
              form = {
                date_from: localDate(new Date()),
                date_to: localDate(new Date()),
                kind: 'closed',
                start: null,
                end: null,
                reason: '',
              };
              open = true;
            "
            ><Plus :size="15" />Add</Button
          >
        </div>
        <AsyncState
          :loading="exceptions.isPending.value"
          :error="exceptions.error.value"
          :empty="!exceptions.data.value?.length"
          empty-text="No schedule exceptions. A little consistency feels good."
          @retry="exceptions.refetch()"
          ><article
            v-for="item in exceptions.data.value"
            :key="item.id"
            class="exception-row"
          >
            <div>
              <span class="tag">{{
                item.kind === "closed" ? "Time off" : "Opening override"
              }}</span>
              <h4>{{ item.date_from }} → {{ item.date_to }}</h4>
              <p>
                {{
                  item.start
                    ? `${item.start.slice(0, 5)} – ${item.end?.slice(0, 5)}`
                    : "All day"
                }}
                · {{ item.reason || "No reason provided" }}
              </p>
            </div>
            <button
              v-if="isAdmin || item.kind === 'closed'"
              class="icon-button"
              :aria-label="`Edit exception ${item.id}`"
              @click="
                editId = item.id;
                form = { ...item };
                exceptionMutation.reset();
                open = true;
              "
            >
              <Pencil :size="16" /></button
            ><button
              v-if="isAdmin || item.kind === 'closed'"
              class="icon-button"
              :disabled="remove.isPending.value"
              :aria-label="`Remove exception ${item.id}`"
              @click="remove.mutate(item.id)"
            >
              <Trash2 :size="16" />
            </button></article
        ></AsyncState>
        <p v-if="remove.error.value" class="form-error">
          {{ remove.error.value.message }}
        </p>
      </section>
      <section class="schedule-info">
        <h3>A considered calendar</h3>
        <p>
          Changes are checked against confirmed appointments. If a change
          affects an existing visit, reschedule or cancel that appointment
          first.
        </p>
        <p>
          Professional hours and opening overrides always stay within studio
          opening hours. Closures take priority.
        </p>
      </section>
      <section v-if="!isAdmin && myProfile.data.value" class="panel">
        <h3>Your assigned services</h3>
        <div class="staff-service-tags">
          <span
            v-for="service in services.data.value?.filter((s) =>
              staff.data.value
                ?.find((p) => p.id === myProfile.data.value?.staff_id)
                ?.service_ids.includes(s.id),
            )"
            :key="service.id"
            class="tag"
            >{{ service.name }}</span
          >
        </div>
      </section>
    </div>
  </div>
  <Dialog
    :open="open"
    title="Make a little space"
    description="Add time off or a date-specific opening override."
    @update:open="open = $event"
    ><form @submit.prevent="exceptionMutation.mutate()">
      <div class="grid-2">
        <label class="field"
          >From<input v-model="form.date_from" required type="date" /></label
        ><label class="field"
          >Through<input
            v-model="form.date_to"
            required
            type="date"
            :min="form.date_from"
        /></label>
      </div>
      <label v-if="isAdmin" class="field"
        >Type<select v-model="form.kind">
          <option value="closed">Time off / closed</option>
          <option value="open">Opening override</option>
        </select></label
      >
      <p class="muted">
        Leave times blank for an all-day closure. Opening overrides require both
        times and replace the recurring intervals for these dates.
      </p>
      <div class="grid-2">
        <label class="field"
          >Start time<input
            v-model="form.start"
            type="time"
            :required="form.kind === 'open'" /></label
        ><label class="field"
          >End time<input
            v-model="form.end"
            type="time"
            :required="form.kind === 'open'"
        /></label>
      </div>
      <label class="field"
        >Reason<input v-model="form.reason" maxlength="300"
      /></label>
      <p v-if="exceptionMutation.error.value" class="form-error" role="alert">
        {{ exceptionMutation.error.value.message }}
      </p>
      <Button :disabled="exceptionMutation.isPending.value"
        >Save exception</Button
      >
    </form></Dialog
  >
</template>
