import type { components } from "./types.generated";
export type Schema = components["schemas"];
export type Service = Schema["ServiceOut"];
export type Staff = Schema["StaffOut"];
export type Appointment = Schema["AppointmentOut"];
export type User = Schema["UserOut"];
export type Business = Schema["SettingsOut"];

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function csrf() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((c) => c.startsWith("sereno_csrf="))
      ?.split("=")[1] ?? "",
  );
}
let refreshing: Promise<unknown> | null = null;
export async function api<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf(),
      ...options.headers,
    },
  });
  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    refreshing ??= api("/auth/refresh", { method: "POST" }, false).finally(
      () => {
        refreshing = null;
      },
    );
    await refreshing;
    return api<T>(path, options, false);
  }
  const data: unknown = await response.json();
  if (!response.ok) {
    const detail = (
      data as {
        detail?: { code?: string; message?: string } | { msg: string }[];
      }
    ).detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(". ")
      : detail?.message;
    throw new ApiError(
      response.status,
      (!Array.isArray(detail) && detail?.code) || "request_failed",
      message || "Something went wrong. Please try again.",
    );
  }
  return data as T;
}
export function write<T>(path: string, method: string, body?: unknown) {
  return api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
export function queryString(
  values: Record<string, string | number | null | undefined>,
) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(
        (entry): entry is [string, string | number] =>
          entry[1] !== null && entry[1] !== undefined && entry[1] !== "",
      )
      .map(([key, value]) => [key, String(value)]),
  ).toString();
}
