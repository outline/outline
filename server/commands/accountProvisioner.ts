import path from "path";
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
import {
  AuthenticationProvider,
  Collection,
  Document,
  Team,
  User,
} from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";
import teamProvisioner from "./teamProvisioner";
import userProvisioner from "./userProvisioner";

type Props = {
  /** The IP address of the incoming request */
  ip: string;
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
    name: string;
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

async function accountProvisioner({
  ip,
  user: userParams,
  team: teamParams,
  authenticationProvider: authenticationProviderParams,
  authentication: authenticationParams,
}: Props): Promise<AccountProvisionerResult> {
  let result;
  let emailMatchOnly;

  try {
    result = await teamProvisioner({
      ...teamParams,
      authenticationProvider: authenticationProviderParams,
      ip,
    });
  } catch (err) {
    // The account could not be provisioned for the provided teamId
    // check to see if we can try authentication using email matching only
    if (err.id === "invalid_authentication") {
      const authenticationProvider = await AuthenticationProvider.findOne({
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

      if (authenticationProvider) {
        emailMatchOnly = true;
        result = {
          authenticationProvider,
          team: authenticationProvider.team,
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

  result = await userProvisioner({
    name: userParams.name,
    email: userParams.email,
    language: userParams.language,
    role: isNewTeam ? UserRole.Admin : undefined,
    avatarUrl: userParams.avatarUrl,
    teamId: team.id,
    ip,
    authentication: emailMatchOnly
      ? undefined
      : {
          authenticationProviderId: authenticationProvider.id,
          ...authenticationParams,
          expiresAt: authenticationParams.expiresIn
            ? new Date(Date.now() + authenticationParams.expiresIn * 1000)
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
      await provisionFirstCollection(team, user);
    }
  }

  return {
    user,
    team,
    isNewUser,
    isNewTeam,
  };
}

async function provisionFirstCollection(team: Team, user: User) {
  await sequelize.transaction(async (transaction) => {
    const collection = await Collection.create(
      {
        name: "Welcome",
        description: `This collection is a quick guide to what ${env.APP_NAME} is all about. Feel free to delete this collection once your team is up to speed with the basics!`,
        teamId: team.id,
        createdById: user.id,
        sort: Collection.DEFAULT_SORT,
        permission: CollectionPermission.ReadWrite,
      },
      {
        transaction,
      }
    );

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
      const document = await Document.create(
        {
          version: 2,
          isWelcome: true,
          parentDocumentId: null,
          collectionId: collection.id,
          teamId: collection.teamId,
          lastModifiedById: collection.createdById,
          createdById: collection.createdById,
          title,
          text,
        },
        { transaction }
      );

      document.content = await DocumentHelper.toJSON(document);

      await document.publish(user, collection.id, {
        silent: true,
        transaction,
      });
    }
  });
}

export default traceFunction({
  spanName: "accountProvisioner",
})(accountProvisioner);
