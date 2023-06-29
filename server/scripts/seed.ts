import "./bootstrap";
import teamCreator from "@server/commands/teamCreator";
import { sequelize } from "@server/database/sequelize";
import env from "@server/env";
import { Team, User } from "@server/models";

const email = process.argv[2];

export default async function main(exit = false) {
  const teamCount = await Team.count();
  if (teamCount === 0) {
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
          name: email.split("@")[0],
          email,
          isAdmin: true,
          isViewer: false,
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
