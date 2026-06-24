#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("checkout errors handle item_not_deposited", () => {
  const src = readFileSync(join(root, "lib/checkout-errors.ts"), "utf8")
  assert.match(src, /case "item_not_deposited"/)
  assert.match(src, /checkout\.itemNotDeposited/)
})

test("listing errors handle item_not_deposited", () => {
  const src = readFileSync(join(root, "lib/listing-errors.ts"), "utf8")
  assert.match(src, /case "item_not_deposited"/)
  assert.match(src, /listings\.errorNotDeposited/)
})

test("en/tr i18n keys stay aligned for core checkout keys", () => {
  const src = readFileSync(join(root, "lib/i18n.tsx"), "utf8")
  const enBlock = src.split("const tr: Dict")[0]
  const trBlock = src.split("const tr: Dict")[1]?.split("const de: Dict")[0] ?? ""

  for (const key of [
    "checkout.itemNotDeposited",
    "listings.errorNotDeposited",
    "orders.botDelivery",
    "admin.moderationTitle",
    "empty.noListings",
  ]) {
    assert.match(enBlock, new RegExp(`"${key.replace(".", "\\.")}"`))
    assert.match(trBlock, new RegExp(`"${key.replace(".", "\\.")}"`))
  }
})

test("production checklist script runs", () => {
  const res = spawnSync(
    process.execPath,
    ["scripts/check-production.mjs"],
    {
      cwd: root,
      env: { ...process.env, NODE_ENV: "development" },
      encoding: "utf8",
    },
  )
  assert.equal(res.status, 0, res.stderr || res.stdout)
  assert.match(res.stdout, /Preflight passed/)
})

test("email subjects cover all notification fixtures", async () => {
  const mod = await import(pathToFileURL(join(root, "lib/email-subjects.ts")).href)
  for (const fixture of mod.NOTIFICATION_MESSAGE_FIXTURES) {
    const subject = mod.buildEmailSubject(fixture.type, fixture.message)
    assert.ok(
      subject.includes(fixture.expectedSubjectIncludes),
      `type=${fixture.type} message=${fixture.message.slice(0, 40)}… subject=${subject}`,
    )
  }
})

test("admin email subjects avoid generic fallback for known alerts", async () => {
  const mod = await import(pathToFileURL(join(root, "lib/email-subjects.ts")).href)
  const withdraw = mod.buildAdminEmailSubject("Yeni para çekme talebi: 750 TL — TR12 (76561198)")
  assert.match(withdraw, /750 TL/)
  assert.doesNotMatch(withdraw, /SkinApex admin uyarısı/)
})

test("cart resolver keeps cached items when listing sync is stale", () => {
  const resolverSrc = readFileSync(join(root, "lib/cart-resolver.ts"), "utf8")
  const providerSrc = readFileSync(join(root, "components/market-provider.tsx"), "utf8")
  assert.match(resolverSrc, /snapshots\?: ReadonlyMap/)
  assert.match(resolverSrc, /cachedByListingId\.get\(id\)/)
  assert.match(providerSrc, /cartSnapshotsRef/)
  assert.match(providerSrc, /resolved\.prunedIds\.length === 0/)
})
