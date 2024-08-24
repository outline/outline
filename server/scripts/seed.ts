import "./bootstrap";
import { UserRole } from "@shared/types";
import { parseEmail } from "@shared/utils/email";
import teamCreator from "@server/commands/teamCreator";
import env from "@server/env";
import { Team, User } from "@server/models";
import { sequelize } from "@server/storage/database";

const email = process.argv[2];

export default async function main(exit = false) {
  const teamCount = await Team.count();
  if (teamCount === 0) {
    const name = parseEmail(email).local;
    const user = await sequelize.transaction(async (transaction) => {
      const team = await teamCreator({
        name: "Wiki",
        subdomain: "wiki",
        authenticationProviders: [],
        transaction,
        ip: "127.0.0.1",
      });

      return await User.create(
        {
          teamId: team.id,
          name,
          email,
          role: UserRole.Admin,
        },
        {
          transaction,
        }
      );
    });

    console.log(
      "email",
      `✅ Seed done – sign-in link: ${
        env.URL
      }/auth/email.callback?token=${user.getEmailSigninToken()}`
    );
  } else {
    console.log("Team already exists, aborting");
  }

  if (exit) {
    process.exit(0);
  }
}

if (process.env.NODE_ENV !== "test") {
  void main(true);
}
