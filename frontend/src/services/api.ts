import {
  EmailDetail,
  EmailKind,
  EmailListParams,
  EmailListResponse,
  EmailStats,
  ScheduleRequest,
  ScheduleResponse,
  User
} from "../types/email";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

/** Lets the auth context react when the session cookie expires mid-use. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: typeof options.body === "string" ? { "Content-Type": "application/json" } : undefined,
      ...options
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running.", 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;

    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore parse failure
    }

    if (res.status === 401 && !path.startsWith("/api/auth/")) onUnauthorized?.();

    throw new ApiError(message, res.status);
  }

  return res.json();
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  auth: {
    google: (credential: string) => request<{ user: User }>("/api/auth/google", json({ credential })),

    login: (email: string, password: string) =>
      request<{ user: User }>("/api/auth/login", json({ email, password })),

    register: (name: string, email: string, password: string) =>
      request<{ user: User }>("/api/auth/register", json({ name, email, password })),

    me: () => request<{ user: User }>("/api/auth/me"),

    logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" })
  },

  emails: {
    list: (kind: EmailKind, params: EmailListParams = {}) => {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") search.set(key, String(value));
      });
      return request<EmailListResponse>(`/api/emails/${kind}?${search}`);
    },

    get: (id: string) => request<{ email: EmailDetail }>(`/api/emails/${id}`),

    stats: () => request<EmailStats>("/api/emails/stats"),

    senders: () => request<{ senders: string[] }>("/api/emails/senders"),

    schedule: (payload: ScheduleRequest) => request<ScheduleResponse>("/api/emails/schedule", json(payload)),

    cancel: (id: string) => request<{ ok: true }>(`/api/emails/${id}`, { method: "DELETE" })
  }
};

export function errorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}
