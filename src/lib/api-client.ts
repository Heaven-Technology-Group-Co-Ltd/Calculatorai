export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

type Envelope = { success?: boolean; data?: unknown; error?: unknown; code?: unknown; details?: unknown; total?: unknown; page?: unknown; per_page?: unknown };

function apiFailure(response: Response, envelope: Envelope): ClientApiError {
  return new ClientApiError(
    typeof envelope.error === "string" ? envelope.error : `API error: ${response.status}`,
    response.status, typeof envelope.code === "string" ? envelope.code : undefined,
    envelope.details, response.headers.get("Retry-After") ?? undefined,
  );
}

function unwrap<T>(body: unknown, envelope: Envelope): T {
  if (envelope.success !== true || !("data" in envelope)) return body as T;
  if ("total" in envelope && "page" in envelope && "per_page" in envelope) return body as T;
  return envelope.data as T;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body: unknown = await response.json().catch(() => undefined);
  const envelope: Envelope = body && typeof body === "object" ? body : {};
  if (!response.ok || envelope.success === false) throw apiFailure(response, envelope);
  return unwrap<T>(body, envelope);
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

function write<T>(method: string, url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

export const apiPost = <T>(url: string, body?: unknown): Promise<T> => write<T>("POST", url, body);
export const apiPut = <T>(url: string, body?: unknown): Promise<T> => write<T>("PUT", url, body);
export const apiPatch = <T>(url: string, body?: unknown): Promise<T> => write<T>("PATCH", url, body);
export const apiDelete = <T>(url: string, body?: unknown): Promise<T> => write<T>("DELETE", url, body);
