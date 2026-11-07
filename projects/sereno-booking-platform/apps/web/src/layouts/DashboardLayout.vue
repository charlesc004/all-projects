<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  UsersRound,
  UserRound,
  BarChart3,
  Settings2,
  Clock3,
  Bell,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
} from "lucide-vue-next";
import { useAuth } from "../features/auth/store";
const auth = useAuth(),
  router = useRouter(),
  mobile = ref(false),
  collapsed = ref(false);
const links = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/dashboard/calendar", label: "Appointments", icon: CalendarDays },
  {
    path: "/dashboard/services",
    label: "Services",
    icon: Sparkles,
    admin: true,
  },
  {
    path: "/dashboard/staff",
    label: "Our people",
    icon: UsersRound,
    admin: true,
  },
  {
    path: "/dashboard/customers",
    label: "Customers",
    icon: UserRound,
    admin: true,
  },
  { path: "/dashboard/schedules", label: "Working hours", icon: Clock3 },
  {
    path: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    admin: true,
  },
  { path: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { path: "/dashboard/profile", label: "My profile", icon: UserRound },
  {
    path: "/dashboard/settings",
    label: "Studio settings",
    icon: Settings2,
    admin: true,
  },
];
async function logout() {
  await auth.logout();
  await router.push("/login");
}
</script>
<template>
  <div class="dashboard-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <aside class="dashboard-sidebar" :class="{ 'mobile-open': mobile }">
      <RouterLink to="/" class="wordmark"
        >SERENO<span class="brand-studio">STUDIO</span></RouterLink
      >
      <div class="workspace-label">
        <span class="studio-avatar">s.</span>
        <div>
          SERENO Studio<small>{{
            auth.user?.role === "admin"
              ? "Studio workspace"
              : "Professional workspace"
          }}</small>
        </div>
        <button
          class="mobile-toggle"
          aria-label="Close navigation"
          @click="mobile = false"
        >
          <X :size="19" />
        </button>
      </div>
      <p class="nav-section-label">YOUR WORKSPACE</p>
      <nav aria-label="Workspace navigation">
        <RouterLink
          v-for="item in links.filter(
            (i) => !i.admin || auth.user?.role === 'admin',
          )"
          :key="item.path"
          :to="item.path"
          exact-active-class="active"
          @click="mobile = false"
          ><component :is="item.icon" :size="18" /><span>{{
            item.label
          }}</span></RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <RouterLink to="/"
          >View studio website <ArrowUpRight :size="16" /></RouterLink
        ><button @click="logout"><LogOut :size="17" /> Sign out</button>
      </div>
      <button
        class="collapse-button"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="collapsed = !collapsed"
      >
        <PanelLeftClose :size="17" />
      </button>
    </aside>
    <div class="dashboard-content">
      <header class="dashboard-header">
        <div>
          <button
            class="mobile-toggle"
            aria-label="Open navigation"
            @click="mobile = true"
          >
            <Menu :size="21" /></button
          ><span
            >Workspace <span class="breadcrumb-divider">/</span>
            {{ String($route.meta.title || "Overview") }}</span
          >
        </div>
        <div>
          <RouterLink
            to="/dashboard/notifications"
            class="icon-button"
            aria-label="Notifications"
            ><Bell :size="19" /></RouterLink
          ><span class="user-avatar">{{
            auth.user?.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
          }}</span
          ><span class="header-user"
            >{{ auth.user?.full_name
            }}<small>{{ auth.user?.role }}</small></span
          >
        </div>
      </header>
      <main class="dashboard-main"><RouterView /></main>
      <footer class="dashboard-footer">
        <span>SERENO Studio</span
        ><span>Thoughtful care. Beautifully organised.</span>
      </footer>
    </div>
  </div>
</template>
