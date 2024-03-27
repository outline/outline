import "./bootstrap";
import { Transaction } from "sequelize";
import { UserRole } from "@shared/types";
import { User } from "@server/models";
import { sequelize } from "@server/storage/database";

let page = parseInt(process.argv[2], 10);
page = Number.isNaN(page) ? 0 : page;

export default async function main(exit = false, limit = 1000) {
  const work = async (page: number): Promise<void> => {
    console.log(`Migrate user role… page ${page}`);
    let users: User[] = [];
    await sequelize.transaction(async (transaction) => {
      users = await User.unscoped().findAll({
        attributes: ["id", "isViewer", "isAdmin"],
        limit,
        offset: page * limit,
        order: [["createdAt", "ASC"]],
        paranoid: false,
        lock: Transaction.LOCK.UPDATE,
        transaction,
      });

      for (const user of users) {
        try {
          if (!user.role) {
            if (user.isAdmin) {
              user.role = UserRole.Admin;
            } else if (user.isViewer) {
              user.role = UserRole.Viewer;
            } else {
              user.role = UserRole.Member;
            }
          }
          await user.save({
            silent: true,
            transaction,
          });
        } catch (err) {
          console.error(`Failed at ${user.id}:`, err);
          continue;
        }
      }
    });
    return users.length === limit ? work(page + 1) : undefined;
  };

  await work(page);

  console.log("Migration complete");

  if (exit) {
    process.exit(0);
  }
}

// In the test suite we import the script rather than run via node CLI
if (process.env.NODE_ENV !== "test") {
  void main(true);
}
