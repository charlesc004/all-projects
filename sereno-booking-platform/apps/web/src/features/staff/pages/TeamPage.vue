<script setup lang="ts">
import { useStaff } from "../../services/api";
import StaffCard from "../components/StaffCard.vue";
import PageHeader from "../../../components/shared/PageHeader.vue";
import AsyncState from "../../../components/shared/AsyncState.vue";
const staff = useStaff();
</script>
<template>
  <div class="container page-space">
    <PageHeader
      eyebrow="GOOD HANDS. KIND PEOPLE."
      title="Meet your people."
      description="Experts in their craft. Thoughtful in their care. Get to know the people behind your next good moment."
    /><AsyncState
      :loading="staff.isPending.value"
      :error="staff.error.value"
      @retry="staff.refetch()"
      ><div class="grid-3">
        <StaffCard
          v-for="person in staff.data.value"
          :key="person.id"
          :staff="person"
        /></div
    ></AsyncState>
  </div>
</template>
