import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "../features/auth/store";
export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    if (to.path === from.path && to.hash === from.hash) return;
    return { top: 0 };
  },
  routes: [
    {
      path: "/",
      component: () => import("../layouts/PublicLayout.vue"),
      children: [
        {
          path: "",
          component: () => import("../features/home/HomePage.vue"),
          meta: { title: "A little time, entirely yours" },
        },
        {
          path: "services",
          component: () =>
            import("../features/services/pages/ServicesPage.vue"),
          meta: { title: "Our services" },
        },
        {
          path: "services/:id",
          component: () =>
            import("../features/services/pages/ServicesPage.vue"),
          meta: { title: "Your treatment" },
        },
        {
          path: "team",
          component: () => import("../features/staff/pages/TeamPage.vue"),
          meta: { title: "Our people" },
        },
        {
          path: "book",
          component: () => import("../features/booking/pages/BookingPage.vue"),
          meta: { title: "Book your moment" },
        },
        ...["login", "register", "forgot-password", "reset-password"].map(
          (path) => ({
            path,
            component: () => import("../features/auth/pages/AuthPage.vue"),
            meta: { title: "Your SERENO space" },
          }),
        ),
        {
          path: "account",
          component: () => import("../layouts/CustomerLayout.vue"),
          meta: { auth: true, roles: ["customer"], title: "Your space" },
          children: [
            {
              path: "",
              component: () =>
                import("../features/appointments/pages/AppointmentsPage.vue"),
            },
            {
              path: "profile",
              component: () => import("../features/auth/pages/ProfilePage.vue"),
            },
            {
              path: "notifications",
              component: () =>
                import("../features/notifications/NotificationsPage.vue"),
            },
          ],
        },
        {
          path: ":pathMatch(.*)*",
          component: () => import("./NotFoundPage.vue"),
          meta: { title: "A moment lost" },
        },
      ],
    },
    {
      path: "/dashboard",
      component: () => import("../layouts/DashboardLayout.vue"),
      meta: { auth: true, roles: ["staff", "admin"] },
      children: [
        {
          path: "",
          component: () =>
            import("../features/admin/dashboard/DashboardPage.vue"),
          meta: { title: "Overview" },
        },
        {
          path: "calendar",
          component: () =>
            import("../features/scheduling/pages/CalendarPage.vue"),
          meta: { title: "Appointments" },
        },
        {
          path: "services",
          component: () =>
            import("../features/admin/services/ManageServicesPage.vue"),
          meta: { title: "Services", roles: ["admin"] },
        },
        {
          path: "staff",
          component: () =>
            import("../features/admin/staff/ManageStaffPage.vue"),
          meta: { title: "Our people", roles: ["admin"] },
        },
        {
          path: "customers",
          component: () =>
            import("../features/admin/customers/CustomersPage.vue"),
          meta: { title: "Customers", roles: ["admin"] },
        },
        {
          path: "schedules",
          component: () =>
            import("../features/scheduling/pages/SchedulesPage.vue"),
          meta: { title: "Working hours" },
        },
        {
          path: "analytics",
          component: () =>
            import("../features/admin/analytics/AnalyticsPage.vue"),
          meta: { title: "Analytics", roles: ["admin"] },
        },
        {
          path: "settings",
          component: () =>
            import("../features/admin/settings/SettingsPage.vue"),
          meta: { title: "Studio settings", roles: ["admin"] },
        },
        {
          path: "notifications",
          component: () =>
            import("../features/notifications/NotificationsPage.vue"),
          meta: { title: "Notifications" },
        },
        {
          path: "profile",
          component: () => import("../features/auth/pages/ProfilePage.vue"),
          meta: { title: "My profile" },
        },
      ],
    },
  ],
});
router.beforeEach(async (to) => {
  const auth = useAuth();
  await auth.restore();
  if (to.meta.auth && !auth.user)
    return { path: "/login", query: { redirect: to.fullPath } };
  const roles = to.meta.roles as string[] | undefined;
  if (roles && auth.user && !roles.includes(auth.user.role))
    return auth.user.role === "customer" ? "/account" : "/dashboard";
  document.title = `${String(to.meta.title || "Your wellbeing")} — SERENO Studio`;
});
