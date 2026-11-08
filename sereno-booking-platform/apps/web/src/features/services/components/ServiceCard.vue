<script setup lang="ts">
import {
  ArrowUpRight,
  Clock3,
  Sparkles,
  Waves,
  Flower2,
  Activity,
} from "lucide-vue-next";
import type { Service } from "../../../lib/api/client";
import { money } from "../../../lib/utils";
defineProps<{ service: Service; compact?: boolean; selected?: boolean }>();
defineEmits<{ select: [id: number] }>();
const icons: Record<string, typeof Waves> = {
  Massage: Waves,
  Skincare: Sparkles,
  Movement: Activity,
  Wellness: Flower2,
};
</script>
<template>
  <article
    class="service-card"
    :class="[{ selected }, 'category-' + service.category.toLowerCase()]"
  >
    <div class="service-top">
      <span class="service-icon"
        ><component
          :is="icons[service.category] || Flower2"
          :size="25"
          :stroke-width="1.35" /></span
      ><span class="tag">{{ service.category }}</span>
    </div>
    <RouterLink :to="`/services/${service.id}`" class="service-name">{{
      service.name
    }}</RouterLink>
    <p>{{ service.description }}</p>
    <div class="service-bottom">
      <span class="muted"
        ><Clock3 :size="14" />{{ service.duration }} min <b>·</b>
        <strong>{{ money(service.price) }}</strong></span
      ><button
        v-if="compact"
        class="round-link"
        :aria-label="`Select ${service.name}`"
        @click="$emit('select', service.id)"
      >
        <ArrowUpRight :size="19" /></button
      ><RouterLink
        v-else
        :to="`/book?service=${service.id}`"
        class="round-link"
        :aria-label="`Book ${service.name}`"
        ><ArrowUpRight :size="19"
      /></RouterLink>
    </div>
  </article>
</template>
