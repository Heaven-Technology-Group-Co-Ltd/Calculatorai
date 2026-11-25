/**
 * /admin Slash Command Definition
 *
 * Subcommands:
 *   /admin stats        — View system & user statistics
 *   /admin maintenance  — Toggle maintenance mode on/off
 *   /admin broadcast    — Send a message to all connected clients
 *
 * Security:
 *   setDefaultMemberPermissions(Administrator) ensures Discord itself
 *   prevents non-admins from invoking the command.
 *   Our additional guild + role checks provide defense-in-depth.
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

/**
 * Build the `/admin` slash command tree.
 * Called once during command registration (deploy-commands.ts).
 * Returns raw JSON for REST API registration.
 */
export function buildAdminCommand(): RESTPostAPIChatInputApplicationCommandsJSONBody {
  return new SlashCommandBuilder()
    .setName("admin")
    .setDescription("🔧 Admin Monitoring & Control System")
    // Layer 1: Discord-native Administrator permission gate
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("View system & user statistics")
        .addStringOption((opt) =>
          opt
            .setName("scope")
            .setDescription("Which stats to view")
            .addChoices(
              { name: "All", value: "all" },
              { name: "System only", value: "system" },
              { name: "Users only", value: "users" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("maintenance")
        .setDescription("Toggle maintenance mode")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Enable or disable maintenance mode")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("message")
            .setDescription("Custom maintenance message (optional)")
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("broadcast")
        .setDescription("Broadcast a message to all users")
        .addStringOption((opt) =>
          opt
            .setName("content")
            .setDescription("Message to broadcast")
            .setRequired(true)
            .setMaxLength(2000)
        )
        .addStringOption((opt) =>
          opt
            .setName("target")
            .setDescription("Target channel(s)")
            .addChoices(
              { name: "All", value: "all" },
              { name: "Web only", value: "web" },
              { name: "Discord only", value: "discord" }
            )
        )
    )
    .toJSON();
}
