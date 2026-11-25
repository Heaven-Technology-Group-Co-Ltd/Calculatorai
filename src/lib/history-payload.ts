/**
 * History payload contract — encodes a calculation entry as a single JSON
 * string for the calculation_history.expression column (legacy rows store
 * plain expressions; decode returns null for those).
 */

export interface HistoryPayload {
  calcId: string;
  calcTitle: string;
  inputs: Record<string, string>;
  result: string;
  unit: string;
}

export function encodeHistoryPayload(p: HistoryPayload): string {
  return JSON.stringify(p);
}

export function decodeHistoryExpression(raw: unknown): HistoryPayload | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (
      typeof obj.calcId !== "string" ||
      typeof obj.calcTitle !== "string" ||
      typeof obj.result !== "string" ||
      typeof obj.unit !== "string" ||
      typeof obj.inputs !== "object" ||
      obj.inputs === null
    ) {
      return null;
    }
    const inputs = obj.inputs as Record<string, unknown>;
    for (const value of Object.values(inputs)) {
      if (typeof value !== "string") return null;
    }
    return {
      calcId: obj.calcId,
      calcTitle: obj.calcTitle,
      inputs: inputs as Record<string, string>,
      result: obj.result,
      unit: obj.unit,
    };
  } catch {
    return null;
  }
}
