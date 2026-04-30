import type { PersistedSession, ProcessedResult } from "../types";

const SESSION_KEY = "bcv:session:v1";
const BLACKLIST_KEY = "bcv:blacklist:v1";
const API_KEY_KEY = "bcv:apikey:v1";

const emptySession = (): PersistedSession => ({
  fileName: null,
  results: {},
  lastProcessedRow: 1,
});

export function loadSession(): PersistedSession {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return emptySession();
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.results) parsed.results = {};
    return parsed;
  } catch {
    return emptySession();
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore quota errors
  }
}

export function upsertResult(result: ProcessedResult): PersistedSession {
  const current = loadSession();
  current.results[result.rowNumber] = result;
  if (result.rowNumber > current.lastProcessedRow) {
    current.lastProcessedRow = result.rowNumber;
  }
  saveSession(current);
  return current;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function loadBlacklist(): string[] {
  try {
    const raw = localStorage.getItem(BLACKLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBlacklist(items: string[]): void {
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(items));
}

export function loadApiKey(): string {
  return localStorage.getItem(API_KEY_KEY) ?? "";
}

export function saveApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_KEY, key);
  else localStorage.removeItem(API_KEY_KEY);
}
