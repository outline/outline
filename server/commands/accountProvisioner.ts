import path from "node:path";
import { readFile } from "fs-extra";
import invariant from "invariant";
import { CollectionPermission, UserRole } from "@shared/types";
import WelcomeEmail from "@server/emails/templates/WelcomeEmail";
import env from "@server/env";
import {
  InvalidAuthenticationError,
  AuthenticationProviderDisabledError,
} from "@server/errors";
import { traceFunction } from "@server/logging/tracing";
import type { User } from "@server/models";
import {
  AuthenticationProvider,
  Collection,
  Document,
  Team,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";
import teamProvisioner from "./teamProvisioner";
import userProvisioner from "./userProvisioner";
import type { APIContext } from "@server/types";
import { addSeconds } from "date-fns";
import { createContext } from "@server/context";

type Props = {
  /** Details of the user logging in from SSO provider */
  user: {
    /** The displayed name of the user */
    name: string;
    /** The email address of the user */
    email: string;
    /** The public url of an image representing the user */
    avatarUrl?: string | null;
    /** The language of the user, if known */
    language?: string;
  };
  /** Details of the team the user is logging into */
  team: {
    /**
     * The internal ID of the team that is being logged into based on the
     * subdomain that the request came from, if any.
     */
    teamId?: string;
    /** The displayed name of the team */
    name?: string;
    /** The domain name from the email of the user logging in */
    domain?: string;
    /** The preferred subdomain to provision for the team if not yet created */
    subdomain: string;
    /** The public url of an image representing the team */
    avatarUrl?: string | null;
  };
  /** Details of the authentication provider being used */
  authenticationProvider: {
    /** The name of the authentication provider, eg "google" */
    name: string;
    /** External identifier of the authentication provider */
    providerId: string;
  };
  /** Details of the authentication from SSO provider */
  authentication: {
    /** External identifier of the user in the authentication provider  */
    providerId: string;
    /** The scopes granted by the access token */
    scopes: string[];
    /** The token provided by the authentication provider */
    accessToken?: string;
    /** The refresh token provided by the authentication provider */
    refreshToken?: string;
    /** A number of seconds that the given access token expires in */
    expiresIn?: number;
  };
};

export type AccountProvisionerResult = {
  user: User;
  team: Team;
  isNewTeam: boolean;
  isNewUser: boolean;
};

async function accountProvisioner(
  ctx: APIContext,
  {
    user: userParams,
    team: teamParams,
    authenticationProvider: authenticationProviderParams,
    authentication: authenticationParams,
  }: Props
): Promise<AccountProvisionerResult> {
  let result;
  let emailMatchOnly;

  const actor = ctx.state.auth?.user;

  // If the user is already logged in and is an admin of the team then we
  // allow them to connect a new authentication provider
  if (actor && actor.teamId === teamParams.teamId && actor.isAdmin) {
    const team = actor.team;
    let authenticationProvider = await AuthenticationProvider.findOne({
      where: {
        ...authenticationProviderParams,
        teamId: team.id,
      },
    });

    if (!authenticationProvider) {
      authenticationProvider = await team.$create<AuthenticationProvider>(
        "authenticationProvider",
        authenticationProviderParams
      );
    }

    return {
      user: actor,
      team,
      isNewUser: false,
      isNewTeam: false,
    };
  }

  try {
    result = await teamProvisioner(ctx, {
      ...teamParams,
      name: teamParams.name || "Wiki",
      authenticationProvider: authenticationProviderParams,
    });
  } catch (err) {
    // The account could not be provisioned for the provided teamId
    // check to see if we can try authentication using email matching only
    if (err.id === "invalid_authentication") {
      const authProvider = await AuthenticationProvider.findOne({
        where: {
          name: authenticationProviderParams.name,
          teamId: teamParams.teamId,
        },
        include: [
          {
            model: Team,
            as: "team",
            required: true,
          },
        ],
        order: [["enabled", "DESC"]],
      });

      if (authProvider) {
        emailMatchOnly = true;
        result = {
          authenticationProvider: authProvider,
          team: authProvider.team,
          isNewTeam: false,
        };
      }
    }

    if (!result) {
      if (err.id) {
        throw err;
      } else {
        throw InvalidAuthenticationError(err.message);
      }
    }
  }

  invariant(result, "Team creator result must exist");
  const { authenticationProvider, team, isNewTeam } = result;

  if (!authenticationProvider.enabled) {
    throw AuthenticationProviderDisabledError();
  }

  result = await userProvisioner(ctx, {
    name: userParams.name,
    email: userParams.email,
    language: userParams.language,
    role: isNewTeam ? UserRole.Admin : undefined,
    avatarUrl: userParams.avatarUrl,
    teamId: team.id,
    authentication: emailMatchOnly
      ? undefined
      : {
          authenticationProviderId: authenticationProvider.id,
          ...authenticationParams,
          expiresAt: authenticationParams.expiresIn
            ? addSeconds(Date.now(), authenticationParams.expiresIn)
            : undefined,
        },
  });
  const { isNewUser, user } = result;

  // TODO: Move to processor
  if (isNewUser) {
    await new WelcomeEmail({
      to: user.email,
      role: user.role,
      teamUrl: team.url,
    }).schedule();
  }

  if (isNewUser || isNewTeam) {
    let provision = isNewTeam;

    // accounts for the case where a team is provisioned, but the user creation
    // failed. In this case we have a valid previously created team but no
    // onboarding collection.
    if (!isNewTeam) {
      const count = await Collection.count({
        where: {
          teamId: team.id,
        },
      });
      provision = count === 0;
    }

    if (provision) {
      await provisionFirstCollection(ctx, team, user);
    }
  }

  return {
    user,
    team,
    isNewUser,
    isNewTeam,
  };
}

async function provisionFirstCollection(
  ctx: APIContext,
  team: Team,
  user: User
) {
  await sequelize.transaction(async (transaction) => {
    const context = createContext({
      ...ctx,
      transaction,
      user,
    });

    const collection = await Collection.createWithCtx(context, {
      name: "Welcome",
      description: `This collection is a quick guide to what ${env.APP_NAME} is all about. Feel free to delete this collection once your team is up to speed with the basics!`,
      teamId: team.id,
      createdById: user.id,
      sort: Collection.DEFAULT_SORT,
      permission: CollectionPermission.ReadWrite,
    });

    // For the first collection we go ahead and create some initial documents to get
    // the team started. You can edit these in /server/onboarding/x.md
    const onboardingDocs = [
      "Integrations & API",
      "Our Editor",
      "Getting Started",
      "What is Outline",
    ];

    for (const title of onboardingDocs) {
      const text = await readFile(
        path.join(process.cwd(), "server", "onboarding", `${title}.md`),
        "utf8"
      );
      const document = await Document.createWithCtx(context, {
        version: 2,
        isWelcome: true,
        parentDocumentId: null,
        collectionId: collection.id,
        teamId: collection.teamId,
        lastModifiedById: collection.createdById,
        createdById: collection.createdById,
        title,
        text,
      });

      document.content = await DocumentHelper.toJSON(document);

      await document.publish(context, {
        collectionId: collection.id,
        silent: true,
      });
    }
  });
}

export default traceFunction({
  spanName: "accountProvisioner",
})(accountProvisioner);
