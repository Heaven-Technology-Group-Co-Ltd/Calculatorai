module.exports = {
  apps: [
    {
      name: "next-discord-app",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
        // Set to x-forwarded-for only behind a proxy that overwrites this header.
        TRUSTED_IP_HEADER: "none",
      }
    }
  ]
}