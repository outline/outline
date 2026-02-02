import { PluginConfiguration } from "@server/models";
import env from "./env";

export interface Bitrix24Config {
  BITRIX24_CLIENT_ID?: string;
  BITRIX24_CLIENT_SECRET?: string;
  BITRIX24_DOMAIN?: string;
}

/**
 * Получить конфигурацию Bitrix24 для команды.
 *
 * Приоритет: значения в базе (PluginConfiguration) → переменные окружения.
 *
 * @param teamId идентификатор команды.
 * @returns объект конфигурации Bitrix24.
 */
export async function getBitrix24Config(
  teamId: string
): Promise<Bitrix24Config> {
  const dbConfig = await PluginConfiguration.findByPluginAndTeam(
    "bitrix24",
    teamId
  );

  return {
    BITRIX24_CLIENT_ID:
      dbConfig?.config.BITRIX24_CLIENT_ID || env.BITRIX24_CLIENT_ID,
    BITRIX24_CLIENT_SECRET:
      dbConfig?.config.BITRIX24_CLIENT_SECRET || env.BITRIX24_CLIENT_SECRET,
    BITRIX24_DOMAIN:
      dbConfig?.config.BITRIX24_DOMAIN || env.BITRIX24_DOMAIN || "bitrix24.com",
  };
}

/**
 * Проверка, что интеграция Bitrix24 настроена (в БД или через env).
 *
 * @param teamId идентификатор команды.
 * @returns true, если заданы clientId, clientSecret и domain.
 */
export async function isBitrix24Configured(
  teamId: string
): Promise<boolean> {
  const config = await getBitrix24Config(teamId);

  return !!(
    config.BITRIX24_CLIENT_ID &&
    config.BITRIX24_CLIENT_SECRET &&
    config.BITRIX24_DOMAIN
  );
}

