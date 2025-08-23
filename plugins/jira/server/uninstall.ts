import { User } from "@server/models";

export async function uninstall(_user: User) {
  // Clean up any Jira-specific data if needed
  // For now, no cleanup is required as we don't store any persistent data
  return;
}
