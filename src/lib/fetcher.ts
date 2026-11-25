/**
 * SWR fetcher wrapper.
 *
 * Auto-unwraps the standard API format:
 * - `{ success: true, data: T }` → returns `data`
 * - `{ success: false, error: string }` → throws
 * - Raw (unwrapped) responses are returned as-is
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();

  // Auto-unwrap standard successResponse format
  // Only unwrap when the ONLY keys are { success, data } — responses with
  // extra keys (e.g. /api/users adds total/page/per_page) pass through as-is.
  if (json && typeof json === "object" && "success" in json) {
    const keys = Object.keys(json);
    const isSimpleWrapper = keys.length === 2 && keys.includes("success") && keys.includes("data");
    if (json.success === true) {
      return isSimpleWrapper ? json.data : json;
    }
    if (json.success === false && "error" in json) {
      throw new Error(json.error);
    }
  }

  // Return raw (unwrapped) response as-is
  return json;
};
