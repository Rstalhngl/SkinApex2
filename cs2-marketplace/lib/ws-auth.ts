// Shared with scripts/ws-server.cjs — keep algorithm in sync via ws-auth.cjs
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wsAuth = require("./ws-auth.cjs") as {
  signWsToken: (steamId: string) => string
  verifyWsToken: (token: string) => { steamId: string } | null
}

export const signWsToken = wsAuth.signWsToken
export const verifyWsToken = wsAuth.verifyWsToken
