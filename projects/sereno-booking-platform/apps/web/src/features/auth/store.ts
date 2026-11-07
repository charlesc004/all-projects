import { defineStore } from "pinia";
import { ref } from "vue";
import { api, write, ApiError, type User } from "../../lib/api/client";
import { queryClient } from "../../app/providers";
export const useAuth = defineStore("auth", () => {
  const user = ref<User | null>(null);
  let restored = false;
  async function restore() {
    if (restored) return;
    try {
      user.value = await api<User>("/auth/me");
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      try {
        user.value = await write<User>("/auth/refresh", "POST");
      } catch (refreshError) {
        if (!(refreshError instanceof ApiError) || refreshError.status !== 401)
          throw refreshError;
      }
    }
    restored = true;
  }
  async function login(path: "login" | "register", body: unknown) {
    const identity = await write<User>(`/auth/${path}`, "POST", body);
    queryClient.clear();
    user.value = identity;
    restored = true;
  }
  async function logout() {
    await write("/auth/logout", "POST");
    user.value = null;
    queryClient.clear();
    restored = true;
  }
  return { user, restore, login, logout };
});
