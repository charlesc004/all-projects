<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Search, ArrowUpRight } from "lucide-vue-next";
import { useServices, useStaff } from "../api";
import ServiceCard from "../components/ServiceCard.vue";
import StaffCard from "../../staff/components/StaffCard.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
import PageHeader from "../../../components/shared/PageHeader.vue";
import Button from "../../../components/ui/button/Button.vue";
import { money, debounce } from "../../../lib/utils";
const route = useRoute(),
  router = useRouter(),
  services = useServices(),
  staff = useStaff();
const search = ref(String(route.query.search || "")),
  category = ref(String(route.query.category || "All"));
const categories = computed(() => [
  "All",
  ...new Set(services.data.value?.map((s) => s.category)),
]);
const filtered = computed(() =>
  services.data.value?.filter(
    (s) =>
      (category.value === "All" || s.category === category.value) &&
      `${s.name} ${s.description}`
        .toLowerCase()
        .includes(String(route.query.search || "").toLowerCase()),
  ),
);
const detail = computed(() =>
  services.data.value?.find((s) => s.id === Number(route.params.id)),
);
const updateUrl = debounce(() =>
  router.replace({
    query: {
      search: search.value || undefined,
      category: category.value === "All" ? undefined : category.value,
    },
  }),
);
watch([search, category], updateUrl);
</script>
<template>
  <div class="container page-space">
    <template v-if="route.params.id"
      ><AsyncState
        :loading="services.isPending.value"
        :error="services.error.value"
        :empty="!detail"
        empty-text="This service is unavailable."
        @retry="services.refetch()"
        ><template v-if="detail"
          ><RouterLink to="/services" class="text-link"
            >← All services</RouterLink
          >
          <div class="service-detail-hero">
            <div>
              <p class="eyebrow">{{ detail.category }} · A MOMENT FOR YOU</p>
              <h1>{{ detail.name }}</h1>
              <p>{{ detail.description }}</p>
              <div class="detail-price">
                {{ detail.duration }} minutes <span>·</span>
                {{ money(detail.price) }}
              </div>
              <Button as-child
                ><RouterLink :to="`/book?service=${detail.id}`"
                  >Book this treatment <ArrowUpRight :size="18" /></RouterLink
              ></Button>
            </div>
            <img src="/images/studio.svg" alt="A tranquil treatment space" />
          </div>
          <h2>Find your <em>person.</em></h2>
          <div class="grid-3">
            <StaffCard
              v-for="person in staff.data.value?.filter((p) =>
                p.service_ids.includes(detail!.id),
              )"
              :key="person.id"
              :staff="person"
            /></div></template></AsyncState></template
    ><template v-else
      ><PageHeader
        eyebrow="CONSIDERED CARE, JUST FOR YOU"
        title="What do you need today?"
        description="A little restoration. A fresh start. A moment to yourself. Find your kind of care." />
      <div class="filter-toolbar">
        <div class="tabs" aria-label="Service category">
          <button
            v-for="c in categories"
            :key="c"
            :class="{ active: category === c }"
            @click="category = c"
          >
            {{ c }}
          </button>
        </div>
        <label class="search-input"
          ><Search :size="17" /><input
            v-model="search"
            type="search"
            placeholder="Find a treatment…"
            aria-label="Search services"
        /></label>
      </div>
      <AsyncState
        :loading="services.isPending.value"
        :error="services.error.value"
        :empty="!filtered?.length"
        empty-text="No treatments match your search. Try another name or category."
        @retry="services.refetch()"
        ><div class="grid-3">
          <ServiceCard
            v-for="service in filtered"
            :key="service.id"
            :service="service"
          /></div></AsyncState
    ></template>
  </div>
</template>
