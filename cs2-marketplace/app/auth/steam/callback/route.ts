// Re-exports the Steam callback handler at /auth/steam/callback
// (same logic as /api/auth/steam/callback, required for specific deployment URLs)
export { GET } from "@/app/api/auth/steam/callback/route"
