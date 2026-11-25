module.exports = {
  apps: [
    {
      name: "next-discord-app",
      script: "pnpm",
      args: "start",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
}