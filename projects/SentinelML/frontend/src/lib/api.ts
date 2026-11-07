let csrfToken = "";
export function setCSRF(value: string) {
  csrfToken = value;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      ...options.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("json")
    ? await response.json()
    : { error: "Service returned an unexpected response; try again shortly" };
  if (
    response.status === 401 &&
    !path.startsWith("/auth/") &&
    typeof window !== "undefined"
  )
    window.dispatchEvent(new Event("sentinel:session-expired"));
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
export const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
export const timestamp = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
