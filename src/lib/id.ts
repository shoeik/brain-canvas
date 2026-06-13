/** Short, collision-resistant id. crypto.randomUUID is available in all GH Pages target browsers. */
export function createId(prefix = "n"): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${uuid}`;
}
