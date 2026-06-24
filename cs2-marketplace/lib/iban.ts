const TR_IBAN_LENGTH = 26

const TR_CHAR_MAP: Record<string, string> = {
  A: "10",
  B: "11",
  C: "12",
  Ç: "12",
  D: "13",
  E: "14",
  F: "15",
  G: "16",
  Ğ: "16",
  H: "17",
  I: "18",
  İ: "19",
  J: "20",
  K: "21",
  L: "22",
  M: "23",
  N: "24",
  O: "25",
  Ö: "25",
  P: "26",
  R: "27",
  S: "28",
  Ş: "28",
  T: "29",
  U: "30",
  Ü: "30",
  V: "31",
  Y: "32",
  Z: "33",
}

export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

export function isValidTurkishIban(raw: string): boolean {
  const iban = normalizeIban(raw)
  if (!/^TR\d{24}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let numeric = ""
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") {
      numeric += ch
    } else {
      const mapped = TR_CHAR_MAP[ch]
      if (!mapped) return false
      numeric += mapped
    }
  }

  let remainder = 0
  for (let i = 0; i < numeric.length; i += 7) {
    const block = String(remainder) + numeric.slice(i, i + 7)
    remainder = Number(BigInt(block) % 97n)
  }
  return remainder === 1
}

export function maskIban(iban: string): string {
  const n = normalizeIban(iban)
  if (n.length < TR_IBAN_LENGTH) return n
  return `${n.slice(0, 4)} **** **** **** **** ${n.slice(-4)}`
}

export function normalizePersonName(raw: string): string {
  return raw
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/\s+/g, " ")
    .replace(/İ/g, "I")
}

export function fullName(firstName: string, lastName: string): string {
  return normalizePersonName(`${firstName} ${lastName}`)
}

/** Compare declared profile name with IBAN account holder name (order-insensitive tokens). */
export function namesMatch(
  firstName: string,
  lastName: string,
  accountHolderName: string,
): boolean {
  const declared = normalizePersonName(`${firstName} ${lastName}`)
  const holder = normalizePersonName(accountHolderName)
  if (!declared || !holder) return false
  if (declared === holder) return true

  const declaredParts = declared.split(" ").filter(Boolean)
  const holderParts = holder.split(" ").filter(Boolean)
  if (declaredParts.length < 2 || holderParts.length < 2) return false

  return (
    declaredParts.every((p) => holderParts.includes(p)) &&
    holderParts.every((p) => declaredParts.includes(p))
  )
}
