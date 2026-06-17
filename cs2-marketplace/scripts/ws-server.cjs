#!/usr/bin/env node
/**
 * SkinApex WebSocket server — broadcasts marketplace events to connected clients.
 *
 * Usage: pnpm ws-server
 * Next.js publishes via POST /internal/broadcast (x-ws-key header).
 */
const http = require("http")
const { readFile } = require("fs/promises")
const path = require("path")
const { WebSocketServer, WebSocket } = require("ws")
const { verifyWsToken } = require("../lib/ws-auth.cjs")

const ROOT = path.join(__dirname, "..")
const PORT = Number(process.env.WS_PORT || 3001)
const API_KEY = process.env.WS_API_KEY?.trim()

/** @type {Set<{ ws: import('ws').WebSocket, steamId: string | null }>} */
const clients = new Set()

async function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, name), "utf-8")
      for (const line of raw.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq <= 0) continue
        const key = trimmed.slice(0, eq).trim()
        let val = trimmed.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = val
      }
      return
    } catch {}
  }
}

function broadcast(message) {
  const json = JSON.stringify(message)
  let sent = 0

  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue
    if (message.steamId && client.steamId !== message.steamId) continue
    client.ws.send(json)
    sent++
  }

  return sent
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")))
    req.on("error", reject)
  })
}

function getStats() {
  let connections = 0
  const steamIds = new Set()
  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue
    connections++
    if (client.steamId) steamIds.add(client.steamId)
  }
  return { connections, activeUsers: steamIds.size }
}

async function main() {
  await loadEnvLocal()

  const key = process.env.WS_API_KEY?.trim()
  if (!key) {
    console.error("[ws-server] WS_API_KEY is required in .env.local")
    process.exit(1)
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/internal/broadcast") {
      const header = req.headers["x-ws-key"]
      if (header !== key) {
        res.writeHead(401)
        res.end("unauthorized")
        return
      }

      try {
        const body = await readBody(req)
        const message = JSON.parse(body)
        if (!message?.channel) {
          res.writeHead(400)
          res.end("invalid")
          return
        }
        const sent = broadcast(message)
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ ok: true, sent }))
      } catch {
        res.writeHead(400)
        res.end("bad json")
      }
      return
    }

    if (req.method === "GET" && req.url === "/internal/stats") {
      if (req.headers["x-ws-key"] !== key) {
        res.writeHead(401)
        res.end("unauthorized")
        return
      }
      const stats = getStats()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(stats))
      return
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true, ...getStats() }))
      return
    }

    res.writeHead(404)
    res.end("not found")
  })

  const wss = new WebSocketServer({ server, path: "/ws" })

  wss.on("connection", (ws) => {
    const client = { ws, steamId: null }
    clients.add(client)

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(String(data))
        if (msg.type === "auth") {
          if (typeof msg.token === "string" && msg.token) {
            const verified = verifyWsToken(msg.token)
            if (verified) client.steamId = verified.steamId
          }
        }
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() }))
        }
      } catch {}
    })

    ws.on("close", () => clients.delete(client))
    ws.on("error", () => clients.delete(client))

    ws.send(JSON.stringify({ type: "connected", ts: Date.now() }))
  })

  server.listen(PORT, () => {
    console.log(`[ws-server] Listening on :${PORT} (ws path /ws)`)
  })
}

main().catch((err) => {
  console.error("[ws-server] Fatal:", err)
  process.exit(1)
})
