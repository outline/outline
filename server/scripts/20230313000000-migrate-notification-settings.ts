import "./bootstrap";
import { NotificationSetting, User } from "@server/models";

const limit = 100;
let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false) {
  const work = async (page: number): Promise<void> => {
    console.log(`Backfill user notification settings… page ${page}`);
    const users = await User.findAll({
      limit,
      offset: page * limit,
      order: [["createdAt", "ASC"]],
    });

    for (const user of users) {
      try {
        const settings = await NotificationSetting.findAll({
          attributes: ["event"],
          where: {
            userId: user.id,
          },
        });

        const eventTypes = settings.map((setting) => setting.event);
        user.notificationSettings = {};

        for (const eventType of eventTypes) {
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
  main(true);
}
