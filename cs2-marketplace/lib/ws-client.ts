"use client"

import type { WsActivityPayload, WsBroadcastMessage, WsChannel } from "@/lib/ws-types"

type ChannelHandler = (msg: WsBroadcastMessage) => void
type ConnectionHandler = (connected: boolean) => void

let socket: WebSocket | null = null
let authSteamId: string | undefined
let wsAuthToken: string | undefined
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let intentionalClose = false

const channelHandlers = new Map<WsChannel, Set<ChannelHandler>>()
const connectionHandlers = new Set<ConnectionHandler>()

function getWsUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL?.trim()
  if (env) return env

  if (typeof window === "undefined") return "ws://127.0.0.1:3001/ws"

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = window.location.hostname
  const port = process.env.NEXT_PUBLIC_WS_PORT?.trim() || "3001"
  return `${proto}//${host}:${port}/ws`
}

function notifyConnection(connected: boolean) {
  connectionHandlers.forEach((cb) => cb(connected))
}

function dispatch(msg: WsBroadcastMessage) {
  const handlers = channelHandlers.get(msg.channel)
  if (!handlers) return
  handlers.forEach((cb) => cb(msg))
}

function scheduleReconnect() {
  if (intentionalClose || reconnectTimer) return
  const delay = Math.min(1000 * 2 ** reconnectAttempt, 30_000)
  reconnectAttempt++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    void connectWs(authSteamId)
  }, delay)
}

async function fetchWsToken(): Promise<string | undefined> {
  try {
    const res = await fetch("/api/auth/ws-token", { credentials: "include" })
    if (!res.ok) return undefined
    const data = (await res.json()) as { token?: string }
    return data.token?.trim() || undefined
  } catch {
    return undefined
  }
}

function sendWsAuth() {
  if (!socket || socket.readyState !== WebSocket.OPEN || !wsAuthToken) return
  socket.send(JSON.stringify({ type: "auth", token: wsAuthToken }))
}

export function isWsConnected(): boolean {
  return socket?.readyState === WebSocket.OPEN
}

export function subscribeWsConnection(cb: ConnectionHandler): () => void {
  connectionHandlers.add(cb)
  cb(isWsConnected())
  return () => connectionHandlers.delete(cb)
}

export function subscribeWsChannel(channel: WsChannel, handler: ChannelHandler): () => void {
  if (!channelHandlers.has(channel)) channelHandlers.set(channel, new Set())
  channelHandlers.get(channel)!.add(handler)
  return () => channelHandlers.get(channel)?.delete(handler)
}

export async function connectWs(steamId?: string): Promise<void> {
  if (typeof window === "undefined") return

  authSteamId = steamId
  intentionalClose = false

  if (steamId) {
    wsAuthToken = await fetchWsToken()
  } else {
    wsAuthToken = undefined
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    if (wsAuthToken && socket.readyState === WebSocket.OPEN) {
      sendWsAuth()
    }
    return
  }

  if (socket) {
    socket.close()
    socket = null
  }

  try {
    socket = new WebSocket(getWsUrl())
  } catch {
    scheduleReconnect()
    return
  }

  socket.onopen = () => {
    reconnectAttempt = 0
    notifyConnection(true)
    sendWsAuth()
  }

  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as WsBroadcastMessage
      if (!msg?.channel) return
      if (msg.steamId && authSteamId && msg.steamId !== authSteamId) return
      dispatch(msg)
    } catch {
      // ignore malformed frames
    }
  }

  socket.onclose = () => {
    notifyConnection(false)
    socket = null
    if (!intentionalClose) scheduleReconnect()
  }

  socket.onerror = () => {
    socket?.close()
  }
}

export function disconnectWs(): void {
  intentionalClose = true
  wsAuthToken = undefined
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  socket?.close()
  socket = null
  notifyConnection(false)
}

export function subscribeWsActivity(handler: (payload: WsActivityPayload) => void): () => void {
  return subscribeWsChannel("activity", (msg) => {
    const payload = msg.payload as WsActivityPayload | undefined
    if (payload?.id && payload.item && payload.action && payload.price) {
      handler(payload)
    }
  })
}
