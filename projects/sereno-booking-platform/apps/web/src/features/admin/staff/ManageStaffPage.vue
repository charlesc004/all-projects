<script setup lang="ts">
import { ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus, Pencil } from "lucide-vue-next";
import { api, write, type Staff, type Schema } from "../../../lib/api/client";
import { useServices } from "../../services/api";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
import Dialog from "../../../components/ui/dialog/Dialog.vue";
const cache = useQueryClient(),
  services = useServices(),
  open = ref(false),
  editId = ref<number | null>(null),
  assigned = ref<number[]>([]);
const blank = (): Schema["StaffCreate"] => ({
  display_name: "",
  title: "",
  bio: "",
  image: "/images/olivia.svg",
  active: true,
  email: "",
  password: "",
});
const form = ref(blank());
const query = useQuery({
  queryKey: ["admin-staff"],
  queryFn: () => api<Staff[]>("/admin/staff"),
});
function edit(item?: Staff) {
  editId.value = item?.id || null;
  form.value = item ? { ...blank(), ...item } : blank();
  assigned.value = item?.service_ids.slice() || [];
  mutation.reset();
  open.value = true;
}
const mutation = useMutation({
  mutationFn: async () => {
    const item = await write<Staff>(
      editId.value ? `/admin/staff/${editId.value}` : "/admin/staff",
      editId.value ? "PATCH" : "POST",
      form.value,
    );
    // Keep the created id so retrying an assignment failure edits the existing account.
    editId.value = item.id;
    await write(`/admin/staff/${item.id}/services`, "PUT", {
      service_ids: assigned.value,
    });
  },
  onSuccess: async () => {
    await cache.invalidateQueries();
    open.value = false;
  },
});
</script>
<template>
  <PageHeader
    eyebrow="GOOD HANDS. KIND PEOPLE."
    title="The people behind the care."
    description="Profiles, service assignments, and room for everyone to do their best work."
    ><Button @click="edit()"
      ><Plus :size="17" />Add a professional</Button
    ></PageHeader
  ><AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    @retry="query.refetch()"
    ><div class="grid-3">
      <article
        v-for="person in query.data.value"
        :key="person.id"
        class="manage-staff-card panel"
      >
        <img
          :src="person.image || '/images/olivia.svg'"
          :alt="`Illustration of ${person.display_name}`"
        /><span
          class="status"
          :class="person.active ? 'confirmed' : 'cancelled'"
          ><span />{{ person.active ? "Active" : "Inactive" }}</span
        >
        <h3>{{ person.display_name }}</h3>
        <p class="muted">{{ person.title }}</p>
        <div class="staff-service-tags">
          <span
            v-for="service in services.data.value?.filter((s) =>
              person.service_ids.includes(s.id),
            )"
            :key="service.id"
            class="tag"
            >{{ service.name }}</span
          >
        </div>
        <div class="dialog-actions">
          <Button variant="outline" size="sm" @click="edit(person)"
            ><Pencil :size="14" />Edit profile</Button
          ><RouterLink
            :to="`/dashboard/schedules?staff=${person.id}`"
            class="text-link"
            >Working hours →</RouterLink
          >
        </div>
      </article>
    </div></AsyncState
  ><Dialog
    :open="open"
    :title="editId ? 'A personal touch' : 'Welcome someone new'"
    description="Manage the professional profile and eligible treatments."
    @update:open="open = $event"
    ><form @submit.prevent="mutation.mutate()">
      <label class="field"
        >Display name<input
          v-model="form.display_name"
          required
          minlength="2"
          maxlength="100" /></label
      ><label class="field"
        >Job title<input
          v-model="form.title"
          required
          minlength="2"
          maxlength="100" /></label
      ><label class="field"
        >Biography<textarea
          v-model="form.bio"
          maxlength="4000"
          rows="3"
        /></label
      ><label class="field"
        >Profile image URL<input
          v-model="form.image"
          placeholder="/images/olivia.svg or https://…"
          maxlength="500" /></label
      ><template v-if="!editId"
        ><label class="field"
          >Account email<input
            v-model="form.email"
            type="email"
            required /></label
        ><label class="field"
          >Initial password<input
            v-model="form.password"
            type="password"
            required
            minlength="10"
            maxlength="128"
            autocomplete="new-password" /></label
      ></template>
      <fieldset class="assignment-fields">
        <legend>Eligible services</legend>
        <label
          v-for="service in services.data.value"
          :key="service.id"
          class="checkbox-field"
          ><input v-model="assigned" type="checkbox" :value="service.id" />{{
            service.name
          }}</label
        >
      </fieldset>
      <label class="checkbox-field"
        ><input v-model="form.active" type="checkbox" />Active profile and staff
        account</label
      >
      <p v-if="mutation.error.value" class="form-error" role="alert">
        {{ mutation.error.value.message }}
      </p>
      <Button :disabled="mutation.isPending.value">{{
        mutation.isPending.value ? "Saving…" : "Save professional"
      }}</Button>
    </form></Dialog
  >
</template>
