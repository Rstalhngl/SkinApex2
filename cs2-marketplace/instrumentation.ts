export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { validateProductionConfig } = await import("@/lib/app-config")
  validateProductionConfig()

  const { getProductionChecklist } = await import("@/lib/app-config")
  for (const item of getProductionChecklist()) {
    if (item.status === "warning") {
      console.warn(`[production-check] ${item.message}`)
    }
  }
}
