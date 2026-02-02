import { PluginConfiguration } from "@server/models";
import env from "./env";

export interface GitLabConfig {
  GITLAB_URL?: string;
  GITLAB_CLIENT_ID?: string;
  GITLAB_CLIENT_SECRET?: string;
}

/**
 * Получить конфигурацию GitLab для команды.
 *
 * Приоритет: значения в базе (PluginConfiguration) → переменные окружения.
 *
 * @param teamId идентификатор команды.
 * @returns объект конфигурации GitLab.
 */
export async function getGitLabConfig(teamId: string): Promise<GitLabConfig> {
  const dbConfig = await PluginConfiguration.findByPluginAndTeam("gitlab", teamId);

  return {
    GITLAB_URL: dbConfig?.config.GITLAB_URL || env.GITLAB_URL || "https://gitlab.com",
    GITLAB_CLIENT_ID: dbConfig?.config.GITLAB_CLIENT_ID || env.GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET:
      dbConfig?.config.GITLAB_CLIENT_SECRET || env.GITLAB_CLIENT_SECRET,
  };
}

/**
 * Проверка, что интеграция GitLab настроена (в БД или через env).
 *
 * @param teamId идентификатор команды.
 * @returns true, если заданы URL, clientId и clientSecret.
 */
export async function isGitLabConfigured(teamId: string): Promise<boolean> {
  const config = await getGitLabConfig(teamId);

  return !!(
    config.GITLAB_URL &&
    config.GITLAB_CLIENT_ID &&
    config.GITLAB_CLIENT_SECRET
  );
}

