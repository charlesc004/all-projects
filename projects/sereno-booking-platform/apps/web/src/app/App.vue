<script setup lang="ts">
import { ref } from "vue";
import { router } from "./router";
const error = ref("");
router.onError((e) => {
  error.value = e.message;
});
</script>
<template>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div id="main-content">
    <div v-if="error" class="global-error" role="alert">
      {{ error }}
      <button
        @click="
          error = '';
          router.go(0);
        "
      >
        Reload
      </button>
    </div>
    <RouterView />
  </div>
</template>
