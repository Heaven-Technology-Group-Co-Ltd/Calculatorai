/**
 * Discord Bot Entry Point — Admin Monitoring & Control Bot
 *
 * Handles:
 * - Ready event (login confirmation + automatic slash command deployment)
 * - InteractionCreate (slash commands → handler dispatch)
 *
 * Architecture:
 * Commands define the schema → handlers execute the logic →
 * admin-api.ts signs and sends to Next.js → permissions.ts guards access.
 */

import {
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Partials,
  REST,
  Routes,
} from "discord.js";
import { handleAdminCommand } from "@/handlers/admin-handler";
import { buildAdminCommand } from "./commands/admin";
import { startHeartbeat } from "@/lib/heartbeat";
import { startLogScheduler } from "@/lib/log-scheduler";

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    // Guilds intent required for slash commands + member cache
    GatewayIntentBits.Guilds,
    // GuildMembers for role verification
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// ---------------------------------------------------------------------------
// Automatic Command Deployment Function
// ---------------------------------------------------------------------------

async function deploySlashCommands(clientId: string, guildId: string, token: string) {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log("🔄 [Deploy] Starting automatic refresh of application (/) commands...");

    // 💡 ถ้าคุณมีคำสั่งใหม่ๆ ในอนาคต ให้เอามาเพิ่มต่อท้ายใน Array นี้ได้เลยครับ
    const commands = [
      buildAdminCommand(),
      //ตัวอย่าง: buildUserCommand(),
    ];

    // ส่งคำสั่งตรงเข้า Guild (เซิร์ฟเวอร์หลัก) เพื่อให้คำสั่งอัปเดตทันที ไม่ต้องรอนาน
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("✅ [Deploy] Successfully reloaded application (/) commands for Admin Guild.");
  } catch (error) {
    console.error("❌ [Deploy Error] Failed to reload application (/) commands:", error);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`🤖 Bot logged in as ${readyClient.user.tag}`);
  console.log(`   Monitoring ${readyClient.guilds.cache.size} guild(s)`);
  
  const adminGuildId = process.env.DISCORD_ADMIN_GUILD_ID;
  console.log(`   Admin guild ID: ${adminGuildId}`);

  // รันระบบรีเฟรชคำสั่งอัตโนมัติเมื่อบอทเปิดใช้งานสำเร็จ
  if (adminGuildId && readyClient.user.id) {
    await deploySlashCommands(
      readyClient.user.id,
      adminGuildId,
      process.env.DISCORD_BOT_TOKEN!
    );
  } else {
    console.warn("⚠️ [Deploy Warning] Missing DISCORD_ADMIN_GUILD_ID in environment setup. Auto-deploy skipped.");
  }

  // Start heartbeat — signals liveness to the status page
  startHeartbeat();

  // Start log scheduler — sends 12h health report to Discord
  startLogScheduler(readyClient);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // Only handle chat input (slash) commands
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "admin") {
      await handleAdminCommand(interaction);
    }
  } catch (err) {
    console.error("[InteractionCreate] Unhandled error:", err);

    // Attempt to inform the user (may fail if interaction already expired)
    if (interaction.isRepliable() && !interaction.replied) {
      try {
        await interaction.reply({
          content: "⚠️ An unexpected error occurred. The admin team has been notified.",
          ephemeral: true,
        });
      } catch {
        // Interaction may have already expired — nothing we can do
      }
    }
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down bot...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 SIGTERM received. Shutting down...");
  client.destroy();
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("DISCORD_BOT_TOKEN is not set!");
  process.exit(1);
}

client.login(TOKEN).catch((err) => {
  console.error("Failed to login:", err);
  process.exit(1);
});