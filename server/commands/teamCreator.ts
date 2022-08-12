import slugify from "slugify";
import { RESERVED_SUBDOMAINS } from "@shared/utils/domains";
import { sequelize } from "@server/database/sequelize";
import Logger from "@server/logging/Logger";
import { APM } from "@server/logging/tracing";
import { Team, Event } from "@server/models";
import { generateAvatarUrl } from "@server/utils/avatars";

type Props = {
  /** The displayed name of the team */
  name: string;
  /** The domain name from the email of the user logging in */
  domain?: string;
  /** The preferred subdomain to provision for the team if not yet created */
  subdomain: string;
  /** The public url of an image representing the team */
  avatarUrl?: string | null;
  /** Details of the authentication provider being used */
  authenticationProviders: {
    /** The name of the authentication provider, eg "google" */
    name: string;
    /** External identifier of the authentication provider */
    providerId: string;
  }[];
  /** The IP address of the incoming request */
  ip: string;
};

async function teamCreator({
  name,
  domain,
  subdomain,
  avatarUrl,
  authenticationProviders,
  ip,
}: Props): Promise<Team> {
  // If the service did not provide a logo/avatar then we attempt to generate
  // one via ClearBit, or fallback to colored initials in worst case scenario
  if (!avatarUrl) {
    avatarUrl = await generateAvatarUrl({
      name,
      domain,
      id: subdomain,
    });
  }

  const team = await sequelize.transaction(async (transaction) => {
    const team = await Team.create(
      {
        name,
        avatarUrl,
        authenticationProviders,
      },
      {
        include: ["authenticationProviders"],
        transaction,
      }
    );

    await Event.create(
      {
        name: "teams.create",
        teamId: team.id,
        ip,
      },
      {
        transaction,
      }
    );

    return team;
  });

  // Note provisioning the subdomain is done outside of the transaction as
  // it is allowed to fail and the team can still be created, it also requires
  // failed queries as part of iteration
  try {
    await provisionSubdomain(team, subdomain);
  } catch (err) {
    Logger.error("Provisioning subdomain failed", err, {
      teamId: team.id,
      subdomain,
    });
  }

  return team;
}

async function provisionSubdomain(team: Team, requestedSubdomain: string) {
  // filter subdomain to only valid characters
  // if there are less than the minimum length, use a default subdomain
  let subdomain = slugify(requestedSubdomain, { lower: true, strict: true });
  subdomain =
    subdomain.length < 3 || RESERVED_SUBDOMAINS.includes(subdomain)
      ? "team"
      : subdomain;

  if (team.subdomain) {
    return team.subdomain;
  }
  let append = 0;

  for (;;) {
    try {
      await team.update({
        subdomain,
      });
      break;
    } catch (err) {
      // subdomain was invalid or already used, try again
      subdomain = `${requestedSubdomain}${++append}`;
    }
  }

  return subdomain;
}

export default APM.traceFunction({
  serviceName: "command",
  spanName: "teamCreator",
})(teamCreator);
