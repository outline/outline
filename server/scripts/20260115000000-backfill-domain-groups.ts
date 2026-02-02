import "./bootstrap";
import { Op } from "sequelize";
import { AuthenticationType } from "@server/types";
import { createContext } from "@server/context";
import { User } from "@server/models";
import domainGroupProvisioner from "@server/commands/domainGroupProvisioner";

const limit = 500;
let page = parseInt(process.argv[2] ?? "0", 10);

if (Number.isNaN(page) || page < 0) {
  page = 0;
}

/**
 * Backfill script to create domain-based groups for existing users.
 *
 * Проходит по всем пользователям с email и создаёт/обновляет группы по домену
 * (например, для `user@company.com` создаётся группа `company.com`) и добавляет
 * пользователя в соответствующую группу.
 */
export default async function main(exit = false): Promise<void> {
  const work = async (currentPage: number): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`Backfill domain groups… page ${currentPage}`);

    const users = await User.unscoped().findAll({
      attributes: ["id", "email", "teamId", "lastActiveIp"],
      where: {
        email: {
          [Op.ne]: null,
        },
      },
      limit,
      offset: currentPage * limit,
      order: [["createdAt", "ASC"]],
      paranoid: false,
    });

    for (const user of users) {
      if (!user.email) {
        // Should not happen because of the where clause, but keep safe guard.
        // eslint-disable-next-line no-continue
        continue;
      }

      try {
        const ctx = createContext({
          user,
          authType: AuthenticationType.APP,
          ip: user.lastActiveIp,
          transaction: undefined,
        });

        // Idempotent: domainGroupProvisioner сам использует findOrCreate,
        // поэтому многократный запуск скрипта безопасен.
        // eslint-disable-next-line no-await-in-loop
        await domainGroupProvisioner(ctx, user, user.email);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "Failed to provision domain group for user",
          user.id,
          user.email,
          err
        );
        // Продолжаем дальше, чтобы не останавливать весь бэкафилл.
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    if (users.length === limit) {
      await work(currentPage + 1);
    }
  };

  await work(page);

  // eslint-disable-next-line no-console
  console.log("Backfill domain groups complete");

  if (exit) {
    process.exit(0);
  }
}

if (process.env.NODE_ENV !== "test") {
  void main(true);
}

