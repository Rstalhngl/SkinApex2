const chains = new Map<string, Promise<unknown>>()

/** Serialize async mutations per named store to reduce JSON race conditions. */
export async function withStoreLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(name) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  chains.set(name, prev.then(() => gate))
  await prev
  try {
    return await fn()
  } finally {
    release()
  }
}
