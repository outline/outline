import "./bootstrap";
import { QueryTypes } from "sequelize";
import { User } from "@server/models";
import { sequelize } from "@server/storage/database";

const limit = 100;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill user notification settings… page ${page}`);
    const users = await User.findAll({
      attributes: ["id", "notificationSettings"],
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
    });

    for (const user of users) {
      try {
        const settings = await sequelize.query<{ event: string }>(
          `SELECT event FROM notification_settings WHERE "userId" = :userId`,
          {
            type: QueryTypes.SELECT,
            replacements: {
              userId: user.id,
            },
          }
        );

        const eventTypes = settings.map((setting) => setting.event);
        user.notificationSettings = {};

        for (const eventType of eventTypes) {
          // @ts-expect-error old migration
          user.notificationSettings[eventType] = true;
          user.changed("notificationSettings", true);
        }

        await user.save({
          hooks: false,
          silent: true,
        });
      } catch (err) {
        console.error(`Failed at ${user.id}:`, err);
        continue;
      }
    }

    return users.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  if (exit) {
    console.log("Backfill complete");
    process.exit(0);
  }
} // In the test suite we import the script rather than run via node CLI

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
