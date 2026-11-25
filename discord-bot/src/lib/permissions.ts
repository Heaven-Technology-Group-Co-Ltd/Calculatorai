/**
 * Permission Guard Module
 *
 * Double-layered permission checking for /admin commands:
 *
 *   Layer 1 — Discord native: `setDefaultMemberPermissions(Administrator)`
 *             Only users with Discord's built-in Administrator flag can even
 *             see/use the command. This is enforced BY Discord itself.
 *
 *   Layer 2 — Application-level: `assertAdminAccess()`
 *             Verifies the user has the specific ADMIN_ROLE_ID from .env
 *             AND is in the correct guild. This is our fallback in case
 *             someone accidentally grants the bot to a non-admin role,
 *             or if the guild config changes.
 *
 * Security: Both layers must pass. If either check fails, the interaction
 * is rejected with an ephemeral error message that only the offending user sees.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

// ---------------------------------------------------------------------------
// Configuration (from .env)
// ---------------------------------------------------------------------------

const ADMIN_GUILD_ID  = process.env.DISCORD_ADMIN_GUILD_ID  ?? "";
const ADMIN_ROLE_ID   = process.env.DISCORD_ADMIN_ROLE_ID   ?? "";

// ---------------------------------------------------------------------------
// Ephemeral error helper
// ---------------------------------------------------------------------------

function errorEmbed(description: string): { embeds: EmbedBuilder[]; ephemeral: true } {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("⛔ Access Denied")
        .setDescription(description)
        .setColor(0xe74c3c)
        .setTimestamp(),
    ],
    ephemeral: true,
  };
}

// ---------------------------------------------------------------------------
// Main guard
// ------------------------------------------------------------------------=

/**
 * Assert that the interacting user has admin access.
 *
 * Checks:
 *   1. The interaction originated from the configured admin guild.
 *   2. The member has the configured admin role.
 *
 * @param interaction - The slash command interaction to check
 * @returns `true` if admin, or replies with an ephemeral error and returns `false`
 */
export async function assertAdminAccess(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  // ── Check 1: Guild boundary ──────────────────────────────────────────────
  if (interaction.guildId !== ADMIN_GUILD_ID) {
    await interaction.reply(
      errorEmbed(
        `This command can only be used inside the designated admin server.\n` +
        `Current guild: \`${interaction.guildId ?? "DM"}\``
      )
    );
    return false;
  }

  // ── Check 2: Role verification ────────────────────────────────────────────
  // interaction.member can be GuildMember (cached) or APIGuildMember (uncached).
  // APIGuildMember has .roles as string[]; GuildMember has .roles.cache (Collection).
  // Safely resolve role IDs from either shape.
  const member = interaction.member;
  if (!member) {
    await interaction.reply(errorEmbed("Unable to verify your server membership."));
    return false;
  }

  let hasRole = false;
  if ("cache" in member.roles) {
    // GuildMember — roles is a GuildMemberRoleManager with .cache
    hasRole = (member.roles as { cache: { has: (id: string) => boolean } }).cache.has(ADMIN_ROLE_ID);
  } else {
    // APIGuildMember — roles is a plain string[] of role IDs
    hasRole = (member.roles as string[]).includes(ADMIN_ROLE_ID);
  }

  if (!hasRole) {
    await interaction.reply(
      errorEmbed(
        `You need the <@&${ADMIN_ROLE_ID}> role to use admin commands.\n` +
        `Please contact a server administrator if you believe this is an error.`
      )
    );
    return false;
  }

  return true;
}

/**
 * Create a "success" embed for admin command results.
 */
export function successEmbed(title: string, description?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ ${title}`)
    .setDescription(description ?? null)
    .setColor(0x2ecc71)
    .setTimestamp();
}

/**
 * Create an "info" embed for displaying stats / status data.
 */
export function infoEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`📊 ${title}`)
    .setColor(0x3498db)
    .setTimestamp();
}

/**
 * Create an "error" embed for displaying command failures.
 */
export function failureEmbed(title: string, error: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`❌ ${title}`)
    .setDescription(`\`\`\`${error.slice(0, 1000)}\`\`\``)
    .setColor(0xe74c3c)
    .setTimestamp();
}
