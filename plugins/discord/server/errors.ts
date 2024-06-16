import httpErrors from "http-errors";

export function DiscordGuildError(
  message = "User is not a member of the required Discord server"
) {
  return httpErrors(400, message, {
    id: "discord_guild_error",
  });
}

export function DiscordGuildRoleError(
  message = "User does not have the required role from the Discord server"
) {
  return httpErrors(400, message, {
    id: "discord_guild_role_error",
  });
}
