/**
 * Slash Command Registration Script
 *
 * Registers all slash commands with Discord's API via PUT (upsert).
 * Run ONCE (or whenever you add/modify commands):
 *
 *   pnpm deploy-commands
 *
 * Discord caches command definitions globally for up to 1 hour.
 * Deploying them explicitly ensures they're always in sync.
 */

import { REST, Routes } from "discord.js";
import { buildAdminCommand } from "@/commands/admin";

const TOKEN  = process.env.DISCORD_BOT_TOKEN!;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const GUILD_ID  = process.env.DISCORD_ADMIN_GUILD_ID!;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error(
    "Missing required env vars: DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_ADMIN_GUILD_ID"
  );
  process.exit(1);
}

const commands = [buildAdminCommand()];

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function deploy(): Promise<void> {
  console.log(`Registering ${commands.length} command(s) to guild ${GUILD_ID}...`);

  const data = await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Commands registered successfully:", JSON.stringify(data, null, 2));
}

deploy().catch((err) => {
  console.error("❌ Failed to register commands:", err);
  process.exit(1);
});
