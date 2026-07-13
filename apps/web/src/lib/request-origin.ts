/** Resolve the current request origin without importing server-only APIs. */
export function requestOrigin(request: Request | null | undefined): string {
  try {
    return new URL(request!.url).origin;
  } catch {
    return "https://modulora.dev";
  }
}
