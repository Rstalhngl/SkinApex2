const STORAGE_KEY = "skinapex-balance-hidden"

export function readBalanceHidden(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeBalanceHidden(hidden: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0")
  } catch {
    /* ignore quota / private mode */
  }
}
