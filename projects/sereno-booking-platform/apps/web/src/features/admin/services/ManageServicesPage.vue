<script setup lang="ts">
import { ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Plus, Pencil, ArrowUpRight } from "lucide-vue-next";
import { api, write, type Service, type Schema } from "../../../lib/api/client";
import { money } from "../../../lib/utils";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import Button from "../../../components/ui/button/Button.vue";
import Dialog from "../../../components/ui/dialog/Dialog.vue";
const cache = useQueryClient(),
  open = ref(false),
  editId = ref<number | null>(null);
const blank = (): Schema["ServiceInput"] => ({
  name: "",
  slug: "",
  description: "",
  category: "Wellness",
  duration: 60,
  price: 8500,
  buffer_before: 0,
  buffer_after: 15,
  active: true,
});
const form = ref(blank());
const query = useQuery({
  queryKey: ["admin-services"],
  queryFn: () => api<Service[]>("/admin/services"),
});
function edit(item?: Service) {
  editId.value = item?.id || null;
  form.value = item ? { ...item } : blank();
  mutation.reset();
  open.value = true;
}
const mutation = useMutation({
  mutationFn: () =>
    write(
      editId.value ? `/admin/services/${editId.value}` : "/admin/services",
      editId.value ? "PATCH" : "POST",
      form.value,
    ),
  onSuccess: async () => {
    await cache.invalidateQueries();
    open.value = false;
  },
});
</script>
<template>
  <PageHeader
    eyebrow="YOUR STUDIO OFFERING"
    title="Care, thoughtfully curated."
    description="Manage the treatments that make your studio yours."
    ><Button @click="edit()"
      ><Plus :size="17" />Add a service</Button
    ></PageHeader
  ><AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    @retry="query.refetch()"
    ><div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Category</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Buffers</th>
            <th>Visibility</th>
            <th><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in query.data.value" :key="item.id">
            <td>
              <strong>{{ item.name }}</strong
              ><small>{{ item.slug }}</small>
            </td>
            <td>{{ item.category }}</td>
            <td>{{ item.duration }} min</td>
            <td>{{ money(item.price) }}</td>
            <td>{{ item.buffer_before }} / {{ item.buffer_after }} min</td>
            <td>
              <span
                class="status"
                :class="item.active ? 'confirmed' : 'cancelled'"
                ><span />{{ item.active ? "Active" : "Hidden" }}</span
              >
            </td>
            <td>
              <button
                class="icon-button"
                :aria-label="`Edit ${item.name}`"
                @click="edit(item)"
              >
                <Pencil :size="16" />
              </button>
            </td>
          </tr>
        </tbody>
      </table></div
  ></AsyncState>
  <p class="muted table-note">
    <ArrowUpRight :size="14" /> Prices and durations are saved as snapshots when
    an appointment is made.
  </p>
  <Dialog
    :open="open"
    :title="editId ? 'Edit treatment' : 'A new kind of care'"
    description="Set the details customers see and the time your team needs."
    @update:open="open = $event"
    ><form @submit.prevent="mutation.mutate()">
      <label class="field"
        >Name<input
          v-model="form.name"
          required
          minlength="2"
          maxlength="100"
          @input="
            !editId &&
            (form.slug = form.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/-$/, ''))
          " /></label
      ><label class="field"
        >URL slug<input
          v-model="form.slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxlength="120" /></label
      ><label class="field"
        >Description<textarea
          v-model="form.description"
          required
          minlength="10"
          maxlength="4000"
          rows="3"
        />
      </label>
      <div class="grid-2">
        <label class="field"
          >Category<input
            v-model="form.category"
            required
            maxlength="60" /></label
        ><label class="field"
          >Duration (minutes)<input
            v-model.number="form.duration"
            type="number"
            required
            min="15"
            max="480" /></label
        ><label class="field"
          >Price (pence)<input
            v-model.number="form.price"
            type="number"
            required
            min="0"
            max="1000000" /></label
        ><label class="field"
          >Before buffer (minutes)<input
            v-model.number="form.buffer_before"
            type="number"
            required
            min="0"
            max="120" /></label
        ><label class="field"
          >After buffer (minutes)<input
            v-model.number="form.buffer_after"
            type="number"
            required
            min="0"
            max="120" /></label
        ><label class="checkbox-field"
          ><input v-model="form.active" type="checkbox" />Active and
          bookable</label
        >
      </div>
      <p v-if="mutation.error.value" class="form-error" role="alert">
        {{ mutation.error.value.message }}
      </p>
      <Button :disabled="mutation.isPending.value">{{
        mutation.isPending.value ? "Saving…" : "Save treatment"
      }}</Button>
    </form></Dialog
  >
</template>
