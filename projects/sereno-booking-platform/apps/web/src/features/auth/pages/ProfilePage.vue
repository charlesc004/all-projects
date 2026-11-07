<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "../store";
import { write, type User } from "../../../lib/api/client";
import Button from "../../../components/ui/button/Button.vue";
const auth = useAuth(),
  name = ref(auth.user?.full_name || ""),
  phone = ref(auth.user?.phone || ""),
  current = ref(""),
  password = ref(""),
  message = ref(""),
  error = ref(""),
  pending = ref(false);
async function save(changePassword = false) {
  pending.value = true;
  message.value = "";
  error.value = "";
  try {
    if (changePassword) {
      await write("/auth/password-change", "POST", {
        current_password: current.value,
        password: password.value,
      });
      await auth.logout();
      location.href = "/login";
    } else {
      auth.user = await write<User>("/auth/me", "PATCH", {
        full_name: name.value,
        phone: phone.value,
      });
      message.value = "Your details have been updated.";
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <div class="profile-grid">
    <section class="panel">
      <h2>Your details</h2>
      <p class="muted">A few details to make your visits feel personal.</p>
      <form @submit.prevent="save()">
        <label class="field"
          >Full name<input
            v-model="name"
            required
            minlength="2"
            maxlength="100"
            autocomplete="name" /></label
        ><label class="field"
          >Email<input :value="auth.user?.email" disabled /></label
        ><label class="field"
          >Phone number<input
            v-model="phone"
            maxlength="40"
            autocomplete="tel"
            type="tel" /></label
        ><Button :disabled="pending">Save changes</Button>
      </form>
    </section>
    <section class="panel">
      <h2>Your password</h2>
      <p class="muted">Keep your space secure.</p>
      <form @submit.prevent="save(true)">
        <label class="field"
          >Current password<input
            v-model="current"
            type="password"
            required
            autocomplete="current-password" /></label
        ><label class="field"
          >New password<input
            v-model="password"
            type="password"
            required
            minlength="10"
            maxlength="128"
            autocomplete="new-password"
        /></label>
        <p class="muted">
          Use at least 10 characters. You’ll sign in again after changing it.
        </p>
        <Button variant="outline" :disabled="pending">Update password</Button>
      </form>
    </section>
  </div>
  <p v-if="message" class="success-note" role="status">{{ message }}</p>
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
</template>
