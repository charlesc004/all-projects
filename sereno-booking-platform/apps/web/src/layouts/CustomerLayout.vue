<script setup lang="ts">
import { useAuth } from "../features/auth/store";
import { CalendarDays, UserRound, Bell, ArrowUpRight } from "lucide-vue-next";
import Button from "../components/ui/button/Button.vue";
const auth = useAuth();
</script>
<template>
  <div class="container page-space">
    <div class="account-welcome">
      <div>
        <p class="eyebrow">YOUR SERENO SPACE</p>
        <h1>Hello, {{ auth.user?.full_name.split(" ")[0] }}<em>.</em></h1>
        <p class="muted">A little more calm, all in one place.</p>
      </div>
      <Button as-child
        ><RouterLink to="/book"
          >Book a new moment <ArrowUpRight :size="17" /></RouterLink
      ></Button>
    </div>
    <nav class="account-nav" aria-label="Account navigation">
      <RouterLink to="/account" exact-active-class="active"
        ><CalendarDays :size="17" />My appointments</RouterLink
      ><RouterLink to="/account/profile" exact-active-class="active"
        ><UserRound :size="17" />My profile</RouterLink
      ><RouterLink to="/account/notifications" exact-active-class="active"
        ><Bell :size="17" />Notifications</RouterLink
      >
    </nav>
    <RouterView />
  </div>
</template>
