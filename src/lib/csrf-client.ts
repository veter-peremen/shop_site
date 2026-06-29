import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function csrfFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  if (method === "GET" || method === "HEAD") {
    return fetch(url, init);
  }

  const headers = new Headers(init.headers);
  headers.set(CSRF_HEADER, getCsrfToken());

  return fetch(url, { ...init, headers });
}
