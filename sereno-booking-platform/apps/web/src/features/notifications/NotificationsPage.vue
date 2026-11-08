<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { Bell, Check } from "lucide-vue-next";
import { api, write, type Schema } from "../../lib/api/client";
import AsyncState from "../../components/shared/AsyncState.vue";
import { dateLabel } from "../../lib/utils";
const cache = useQueryClient();
const query = useQuery({
  queryKey: ["notifications"],
  queryFn: () => api<Schema["NotificationOut"][]>("/notifications"),
});
const mutation = useMutation({
  mutationFn: (id: number) => write(`/notifications/${id}/read`, "PATCH"),
  onSuccess: () => cache.invalidateQueries({ queryKey: ["notifications"] }),
});
</script>
<template>
  <h2>A little <em>heads-up.</em></h2>
  <p class="muted">All your appointment updates, in one place.</p>
  <AsyncState
    :loading="query.isPending.value"
    :error="query.error.value"
    :empty="!query.data.value?.length"
    empty-text="You’re all caught up. Your next booking update will appear here."
    @retry="query.refetch()"
    ><div class="notification-list">
      <article
        v-for="item in query.data.value"
        :key="item.id"
        class="notification"
        :class="{ unread: !item.read }"
      >
        <Bell :size="21" />
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.message }}</p>
          <small
            >{{ dateLabel(item.created_at) }}
            <template v-if="item.appointment_id"
              >· Appointment #{{ item.appointment_id }}</template
            ></small
          ><RouterLink
            v-if="item.appointment_id"
            :to="`/${$route.path.startsWith('/dashboard') ? 'dashboard/calendar' : 'account'}?appointment=${item.appointment_id}`"
            class="text-link"
            >View appointments →</RouterLink
          >
          <RouterLink v-else to="/dashboard/schedules" class="text-link"
            >View assigned services →</RouterLink
          >
        </div>
        <button
          v-if="!item.read"
          class="icon-button"
          :disabled="mutation.isPending.value"
          :aria-label="`Mark ${item.title} as read`"
          @click="mutation.mutate(item.id)"
        >
          <Check :size="18" />
        </button>
      </article></div
  ></AsyncState>
  <p v-if="mutation.error.value" class="form-error">
    {{ mutation.error.value.message }}
  </p>
</template>
