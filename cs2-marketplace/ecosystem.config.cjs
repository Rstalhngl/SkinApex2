module.exports = {
  apps: [
    {
      name: "skinapex",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_BASE_URL: "https://skinapex.net",
        // Add STEAM_API_KEY here if you have one:
        // STEAM_API_KEY: "your_key_here",
      },
      max_memory_restart: "512M",
      // Restart on crash, but not in a loop
      min_uptime: "10s",
      max_restarts: 5,
    },
  ],
}
