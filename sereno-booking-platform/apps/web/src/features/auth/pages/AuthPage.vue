<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import { ArrowRight, Leaf } from "lucide-vue-next";
import Button from "../../../components/ui/button/Button.vue";
import { useAuth } from "../store";
import { write } from "../../../lib/api/client";
const auth = useAuth(),
  route = useRoute(),
  router = useRouter();
const name = ref(""),
  email = ref(""),
  password = ref(""),
  error = ref(""),
  message = ref(""),
  pending = ref(false);
const mode = computed(() =>
  route.path === "/register"
    ? "register"
    : route.path === "/forgot-password"
      ? "forgot"
      : route.path === "/reset-password"
        ? "reset"
        : "login",
);
const titles = {
  register: "A little space for you.",
  forgot: "Let’s get you back in.",
  reset: "A fresh start.",
  login: "Welcome to your space.",
};
async function submit() {
  error.value = "";
  message.value = "";
  pending.value = true;
  try {
    if (mode.value !== "reset") z.email().parse(email.value);
    if (["register", "reset"].includes(mode.value))
      z.string()
        .min(10, "Use at least 10 characters.")
        .max(128)
        .parse(password.value);
    if (mode.value === "register")
      z.string()
        .trim()
        .min(2, "Please enter your full name.")
        .parse(name.value);
    if (mode.value === "forgot") {
      const result = await write<{ message: string }>(
        "/auth/password-reset/request",
        "POST",
        { email: email.value },
      );
      message.value = result.message;
    } else if (mode.value === "reset") {
      await write("/auth/password-reset/confirm", "POST", {
        token: String(route.query.token || ""),
        password: password.value,
      });
      await router.push("/login");
    } else {
      await auth.login(mode.value, {
        email: email.value,
        password: password.value,
        full_name: name.value,
      });
      const redirect = String(route.query.redirect || "");
      await router.push(
        redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : auth.user?.role === "customer"
            ? "/account"
            : "/dashboard",
      );
    }
  } catch (e) {
    error.value =
      e instanceof z.ZodError
        ? e.issues[0]?.message || "Check the form."
        : e instanceof Error
          ? e.message
          : "Please try again.";
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <div class="auth-layout container">
    <div class="auth-art">
      <img src="/images/studio.svg" alt="A welcoming space at SERENO" />
      <div>
        <Leaf :size="30" />
        <h2>A little time,<br /><em>entirely yours.</em></h2>
      </div>
    </div>
    <div class="auth-form">
      <p class="eyebrow">SERENO STUDIO</p>
      <h1>{{ titles[mode] }}</h1>
      <p class="muted">
        {{
          mode === "register"
            ? "Create your account for more good moments."
            : mode === "login"
              ? "Sign in to manage your appointments and find your next moment of calm."
              : "Choose a secure path back to your account."
        }}
      </p>
      <form @submit.prevent="submit">
        <label v-if="mode === 'register'" class="field"
          >Full name<input
            v-model="name"
            required
            autocomplete="name"
            maxlength="100" /></label
        ><label v-if="mode !== 'reset'" class="field"
          >Email address<input
            v-model="email"
            type="email"
            autocomplete="email"
            required
            maxlength="254" /></label
        ><label v-if="mode !== 'forgot'" class="field"
          >Password<input
            v-model="password"
            type="password"
            :autocomplete="
              mode === 'login' ? 'current-password' : 'new-password'
            "
            required
            :minlength="mode === 'login' ? 1 : 10"
            maxlength="128" /></label
        ><RouterLink
          v-if="mode === 'login'"
          to="/forgot-password"
          class="forgot-link"
          >Forgot your password?</RouterLink
        >
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <p v-if="message" class="success-note" role="status">{{ message }}</p>
        <Button class="full-width" :disabled="pending"
          >{{
            pending
              ? "One moment…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create my account"
                  : mode === "forgot"
                    ? "Request reset link"
                    : "Save new password"
          }}
          <ArrowRight :size="18"
        /></Button>
      </form>
      <p v-if="['login', 'register'].includes(mode)" class="auth-switch">
        {{
          mode === "login" ? "New to SERENO?" : "Already have your own space?"
        }}
        <RouterLink
          :to="{
            path: mode === 'login' ? '/register' : '/login',
            query: route.query,
          }"
          >{{ mode === "login" ? "Create an account" : "Sign in" }}</RouterLink
        >
      </p>
      <details v-if="mode === 'login'" class="demo-credentials">
        <summary>Explore with a demo account</summary>
        <p>
          customer@sereno.example<br />staff@sereno.example<br />admin@sereno.example
        </p>
        <p>Password: <code>SerenoDemo!2026</code></p>
        <small>Local development accounts only.</small>
      </details>
    </div>
  </div>
</template>
