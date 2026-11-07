// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { queryClient } from "../../app/providers";
import { useAuth } from "./store";

afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});
describe("Session boundaries", () => {
  it("clears private server data when the signed-in identity changes", async () => {
    setActivePinia(createPinia());
    const identity = {
      id: 99,
      full_name: "Test Customer",
      email: "test@example.com",
      phone: "",
      role: "customer",
      active: true,
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            new Response(JSON.stringify(identity), { status: 200 }),
          ),
        ),
    );
    queryClient.setQueryData(["appointments", "mine", 0], {
      items: [{ id: 1, customer_name: "Previous Customer" }],
    });
    const auth = useAuth();
    await auth.login("login", {
      email: identity.email,
      password: "ExampleTest!2026",
    });
    expect(
      queryClient.getQueryData(["appointments", "mine", 0]),
    ).toBeUndefined();
    expect(auth.user?.id).toBe(99);
    queryClient.setQueryData(["notifications"], [{ id: 1 }]);
    await auth.logout();
    expect(queryClient.getQueryData(["notifications"])).toBeUndefined();
    expect(auth.user).toBeNull();
  });
});
