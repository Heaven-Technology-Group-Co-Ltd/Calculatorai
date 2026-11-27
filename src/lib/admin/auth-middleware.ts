import type { AdminGateFailure } from "./admin-gate";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean;
}

export class AdminGateError extends Error {
  readonly kind: AdminGateFailure["kind"];
  readonly status: AdminGateFailure["status"];

  constructor(failure: AdminGateFailure) {
    super(failure.message);
    this.name = "AdminGateError";
    this.kind = failure.kind;
    this.status = failure.status;
  }
}
