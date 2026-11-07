<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowUpRight,
  Menu,
  X,
  Instagram,
  MapPin,
  ArrowRight,
  UserRound,
} from "lucide-vue-next";
import Button from "../components/ui/button/Button.vue";
import { useAuth } from "../features/auth/store";
const auth = useAuth(),
  route = useRoute(),
  router = useRouter(),
  mobile = ref(false);
const navigation = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Our services" },
  { to: "/team", label: "Our people" },
  { to: "/#studio", label: "The studio" },
];
function isCurrent(to: string) {
  if (to === "/#studio") return route.path === "/" && route.hash === "#studio";
  if (to === "/") return route.path === "/" && route.hash !== "#studio";
  return route.path === to || route.path.startsWith(`${to}/`);
}
async function signOut() {
  await auth.logout();
  await router.push("/");
}
</script>
<template>
  <div class="public-shell">
    <div class="announcement">
      A little time for yourself goes a long way.
      <RouterLink to="/book"
        >Find your moment <ArrowRight :size="12"
      /></RouterLink>
    </div>
    <header class="public-header container">
      <RouterLink to="/" class="wordmark" aria-label="SERENO home"
        ><span class="brand-icon">s</span>SERENO<span class="brand-studio"
          >STUDIO</span
        ></RouterLink
      >
      <nav
        id="public-navigation"
        :class="{ 'mobile-open': mobile }"
        aria-label="Main navigation"
        @click="mobile = false"
        @keydown.esc="mobile = false"
      >
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          custom
          v-slot="{ href, navigate }"
        >
          <a
            :href="href"
            :class="{ 'is-current': isCurrent(item.to) }"
            :aria-current="
              isCurrent(item.to)
                ? item.to.includes('#')
                  ? 'location'
                  : 'page'
                : undefined
            "
            @click="navigate"
            >{{ item.label }}</a
          >
        </RouterLink>
      </nav>
      <div class="header-actions">
        <RouterLink
          v-if="!auth.user"
          to="/login"
          class="sign-in"
          aria-label="Sign in"
          ><UserRound class="account-icon" :size="17" /><span
            class="account-label"
            >Sign in</span
          ></RouterLink
        ><RouterLink
          v-else
          :to="auth.user.role === 'customer' ? '/account' : '/dashboard'"
          class="sign-in"
          aria-label="My space"
          ><UserRound class="account-icon" :size="17" /><span
            class="account-label"
            >My space</span
          ></RouterLink
        ><Button as-child size="sm"
          ><RouterLink to="/book" aria-label="Book a visit"
            ><span class="booking-label">Book a visit</span
            ><span class="booking-label-short">Book</span>
            <ArrowUpRight :size="16" /></RouterLink></Button
        ><button
          class="mobile-toggle"
          :aria-expanded="mobile"
          aria-controls="public-navigation"
          aria-label="Toggle navigation"
          @click="mobile = !mobile"
        >
          <component :is="mobile ? X : Menu" />
        </button>
      </div>
    </header>
    <main><RouterView /></main>
    <footer class="site-footer">
      <div class="container footer-top">
        <div>
          <RouterLink to="/" class="wordmark"
            >SERENO<span class="brand-studio">STUDIO</span></RouterLink
          >
          <p>
            A considered space for your wellbeing.<br />A little time, entirely
            yours.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <RouterLink to="/services">Our services</RouterLink
          ><RouterLink to="/team">Our people</RouterLink
          ><RouterLink to="/book">Book a visit</RouterLink>
        </div>
        <div>
          <h4>Find us</h4>
          <p>
            <MapPin :size="14" /> 28 Willow Lane, London<br />Monday – Saturday
            · 9am – 7pm
          </p>
          <a href="mailto:hello@sereno.example">hello@sereno.example</a>
        </div>
        <div>
          <h4>Your space</h4>
          <RouterLink :to="auth.user ? '/account' : '/login'"
            >My appointments</RouterLink
          ><button v-if="auth.user" class="footer-button" @click="signOut">
            Sign out</button
          ><a href="/#studio"
            ><Instagram :size="16" /> A closer look at the studio</a
          >
        </div>
      </div>
      <div class="container footer-bottom">
        <span
          >© {{ new Date().getFullYear() }} SERENO Studio. Made for a slower
          moment.</span
        ><span>Fictional studio · Portfolio demonstration</span>
      </div>
    </footer>
  </div>
</template>
