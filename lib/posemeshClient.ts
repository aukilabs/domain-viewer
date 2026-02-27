const STORAGE_KEY = "posemesh_client_id";
const COOKIE_MAX_AGE = 31536000; // 1 year

/**
 * Returns the persisted posemesh client ID, creating one if it doesn't exist.
 * Checks localStorage, sessionStorage, and cookies for an existing ID.
 * On first call in a new browser, generates a UUID and stores it in all three
 * locations for maximum persistence.
 *
 * Safe to call on the server — returns a temporary UUID without touching storage.
 */
export function getOrCreatePosemeshClientId(): string {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  try {
    const existing =
      localStorage.getItem(STORAGE_KEY) ||
      sessionStorage.getItem(STORAGE_KEY) ||
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${STORAGE_KEY}=`))
        ?.split("=")[1];

    if (existing) return existing;
  } catch {
    // Storage unavailable (e.g. private browsing) — fall through to generate
  }

  const id = crypto.randomUUID();

  try {
    localStorage.setItem(STORAGE_KEY, id);
    sessionStorage.setItem(STORAGE_KEY, id);
    document.cookie = `${STORAGE_KEY}=${id}; path=/; max-age=${COOKIE_MAX_AGE}`;
  } catch {
    // Best-effort — if storage writes fail, the ID still works for the current session
  }

  return id;
}
