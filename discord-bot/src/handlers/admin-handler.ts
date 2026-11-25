/**
 * /admin Command Interaction Handler
 *
 * Processes all `/admin <subcommand>` interactions:
 *   1. Double-layer permission check (guild + role).
 *   2. Defer reply (API calls can take time — ephemeral so only admin sees).
 *   3. Dispatch to the typed API client.
 *   4. Format the result into a rich embed response.
 */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { assertAdminAccess, infoEmbed, successEmbed, failureEmbed } from "@/lib/permissions";
import { sendAdminCommand } from "@/lib/admin-api";

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleAdminCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // ── Permission guard (Layer 2: guild + role) ─────────────────────────────
  const isAdmin = await assertAdminAccess(interaction);
  if (!isAdmin) return;

  const subcommand = interaction.options.getSubcommand();
  const callerId  = interaction.user.id;
  const callerTag = interaction.user.tag;

  // — Defer so the 3-second Discord timeout doesn't kill our API call —
  await interaction.deferReply({ ephemeral: true });

  try {
    switch (subcommand) {
      case "stats":
        await handleStats(interaction);
        break;
      case "maintenance":
        await handleMaintenance(interaction);
        break;
      case "broadcast":
        await handleBroadcast(interaction);
        break;
      default:
        await interaction.editReply({
          embeds: [failureEmbed("Unknown Command", `Unrecognized subcommand: ${subcommand}`)],
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await interaction.editReply({
      embeds: [failureEmbed("Command Failed", message)],
    });
  }
}

// ---------------------------------------------------------------------------
// Subcommand handlers
// ---------------------------------------------------------------------------

async function handleStats(interaction: ChatInputCommandInteraction): Promise<void> {
  const scope = interaction.options.getString("scope") ?? "all";

  const data = await sendAdminCommand(
    { action: "get_stats", scope: scope as "users" | "system" | "all" },
    interaction.user.id,
    interaction.user.tag
  );

  // Format the response into a readable embed
  const embed = infoEmbed("System Statistics");

  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;

    if (d.system) {
      const sys = d.system as Record<string, unknown>;
      embed.addFields(
        {
          name: "🔧 Maintenance Mode",
          value: sys.maintenanceMode ? "🟢 **ON**" : "🔴 **OFF**",
          inline: true,
        },
        {
          name: "⏱️ Uptime Since",
          value: `\`${String(sys.uptimeSince ?? "N/A")}\``,
          inline: true,
        },
        {
          name: "🖥️ Platform",
          value: `\`${String(sys.platform ?? "N/A")}\` (Node ${String(sys.nodeVersion ?? "?")})`,
          inline: true,
        }
      );

      if (sys.lastCommand) {
        embed.addFields({
          name: "📋 Last Command",
          value: `\`${String(sys.lastCommand)}\` by ${String(sys.lastCommandBy ?? "?").replace(/`/g, "'")} at \`${String(sys.lastCommandAt ?? "?")}\``,
          inline: false,
        });
      }
    }

    if (d.users) {
      const users = d.users as Record<string, number>;
      embed.addFields(
        { name: "👥 Total Users", value: `\`${users.total ?? 0}\``, inline: true },
        { name: "🆕 Last 24 Hours", value: `\`${users.last24h ?? 0}\``, inline: true }
      );
    }
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleMaintenance(interaction: ChatInputCommandInteraction): Promise<void> {
  const enabled = interaction.options.getBoolean("enabled", true);
  const message = interaction.options.getString("message") ?? undefined;

  const data = await sendAdminCommand(
    { action: "toggle_maintenance", enabled, message },
    interaction.user.id,
    interaction.user.tag
  );

  const d = data as Record<string, unknown>;
  const embed = successEmbed(
    `Maintenance Mode ${enabled ? "Enabled" : "Disabled"}`,
    `Changed by **${String(d.changedBy ?? interaction.user.tag)}** at \`${String(d.changedAt ?? "now")}\`\n\n` +
    (d.message ? `Message: \`${String(d.message)}\`` : `Status: \`${enabled ? "ON" : "OFF"}\``)
  );

  await interaction.editReply({ embeds: [embed] });
}

async function handleBroadcast(interaction: ChatInputCommandInteraction): Promise<void> {
  const content = interaction.options.getString("content", true);
  const target  = (interaction.options.getString("target") ?? "all") as "all" | "web" | "discord";

  await sendAdminCommand(
    { action: "broadcast", content, target },
    interaction.user.id,
    interaction.user.tag
  );

  const embed = successEmbed(
    "Broadcast Sent",
    `**Target:** \`${target}\`\n\n**Content:**\n\`\`\`${content.slice(0, 900)}\`\`\``
  );

  await interaction.editReply({ embeds: [embed] });
}
