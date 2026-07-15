export async function fetchWithManualRedirects({
  inputUrl,
  validateUrl,
  fetcher = fetch,
  init = {},
  maximumRedirects = 3,
}: {
  inputUrl: URL;
  validateUrl: (url: URL) => Promise<boolean> | boolean;
  fetcher?: typeof fetch;
  init?: RequestInit;
  maximumRedirects?: number;
}): Promise<{ url: URL; response: Response } | null> {
  let current = inputUrl;
  for (let redirect = 0; redirect <= maximumRedirects; redirect += 1) {
    if (!(await validateUrl(current))) return null;
    const response = await fetcher(current, { ...init, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      await response.body?.cancel();
      current = new URL(location, current);
      continue;
    }
    return { url: current, response };
  }
  return null;
}
