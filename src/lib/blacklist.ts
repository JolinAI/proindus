/**
 * Returns true if the given email matches any blacklist entry.
 * An entry is treated as a domain when it starts with "@" or contains no "@".
 */
export function isBlacklisted(email: string, blacklist: string[]): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  for (const rawEntry of blacklist) {
    const entry = rawEntry.trim().toLowerCase();
    if (!entry) continue;
    if (entry.startsWith("@")) {
      if (normalized.endsWith(entry)) return true;
    } else if (entry.includes("@")) {
      if (normalized === entry) return true;
    } else {
      // bare domain like "uchile.cl"
      if (normalized.endsWith("@" + entry) || normalized.endsWith("." + entry)) {
        return true;
      }
    }
  }
  return false;
}

export function normalizeBlacklistEntry(value: string): string {
  return value.trim().toLowerCase();
}
