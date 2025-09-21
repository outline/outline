import { InferCreationAttributes } from "sequelize";
import slugify from "slugify";
import { RESERVED_SUBDOMAINS } from "@shared/utils/domains";
import { traceFunction } from "@server/logging/tracing";
import { Team } from "@server/models";
import { APIContext } from "@server/types";

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
};

async function teamCreator(
  ctx: APIContext,
  { name, subdomain, avatarUrl, authenticationProviders }: Props
): Promise<Team> {
  if (!avatarUrl?.startsWith("http")) {
    avatarUrl = null;
  }

  const availableSubdomain = await findAvailableSubdomain(ctx, subdomain);
  return await Team.createWithCtx(
    ctx,
    {
      name,
      subdomain: availableSubdomain,
      avatarUrl,
      authenticationProviders,
    } as Partial<InferCreationAttributes<Team>>,
    undefined,
    {
      include: ["authenticationProviders"],
    }
  );
}

async function findAvailableSubdomain(
  ctx: APIContext,
  requestedSubdomain: string
) {
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
      transaction: ctx.state.transaction,
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
