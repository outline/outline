import { InferCreationAttributes, Transaction } from "sequelize";
import slugify from "slugify";
import { RESERVED_SUBDOMAINS } from "@shared/utils/domains";
import { traceFunction } from "@server/logging/tracing";
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
  /** Optional transaction to be chained from outside */
  transaction: Transaction;
};

async function teamCreator({
  name,
  domain,
  subdomain,
  avatarUrl,
  authenticationProviders,
  ip,
  transaction,
}: Props): Promise<Team> {
  // If the service did not provide a logo/avatar then we attempt to generate
  // one via ClearBit, or fallback to colored initials in worst case scenario
  if (!avatarUrl || !avatarUrl.startsWith("http")) {
    avatarUrl = await generateAvatarUrl({
      domain,
      id: subdomain,
    });
  }

  const team = await Team.create(
    {
      name,
      avatarUrl,
      authenticationProviders,
    } as Partial<InferCreationAttributes<Team>>,
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

  const availableSubdomain = await findAvailableSubdomain(team, subdomain);
  await team.update({ subdomain: availableSubdomain }, { transaction });

  return team;
}

async function findAvailableSubdomain(team: Team, requestedSubdomain: string) {
  // filter subdomain to only valid characters
  // if there are less than the minimum length, use a default subdomain
  const normalizedSubdomain = slugify(requestedSubdomain, {
    lower: true,
    strict: true,
  });
  let subdomain =
    normalizedSubdomain.length < 3 ||
    RESERVED_SUBDOMAINS.includes(normalizedSubdomain)
      ? "team"
      : normalizedSubdomain;

  let append = 0;

  for (;;) {
    const existing = await Team.findOne({
      where: { subdomain },
      paranoid: false,
    });

    if (existing) {
      // subdomain was invalid or already used, try another
      subdomain = `${normalizedSubdomain}${++append}`;
    } else {
      break;
    }
  }

  return subdomain;
}

export default traceFunction({
  spanName: "teamCreator",
})(teamCreator);
