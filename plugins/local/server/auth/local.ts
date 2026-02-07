import crypto from "crypto";
import { promisify } from "util";
import Router from "koa-router";
import { Op } from "sequelize";
import { Client } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import { AuthorizationError, ValidationError } from "@server/errors";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User, Team, AuthenticationProvider } from "@server/models";
import type { APIContext } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { signIn } from "@server/utils/authentication";
import * as T from "./schema";

const router = new Router();
const scrypt = promisify(crypto.scrypt);

// Password hashing utilities using Node's built-in scrypt
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derivedKey);
}

// Login route
router.post(
  "local",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.LocalLoginSchema),
  async (ctx: APIContext<T.LocalLoginReq>) => {
    const { email, password } = ctx.input.body;

    const domain = parseDomain(ctx.request.hostname);

    let team: Team | null | undefined;
    if (!env.isCloudHosted) {
      team = await Team.scope("withAuthenticationProviders").findOne();
    } else if (domain.custom) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { domain: domain.host },
      });
    } else if (domain.teamSubdomain) {
      team = await Team.scope("withAuthenticationProviders").findOne({
        where: { subdomain: domain.teamSubdomain },
      });
    }

    if (!team) {
      throw AuthorizationError("No team found");
    }

    // Check if local auth is enabled for this team
    const localProvider = team.authenticationProviders?.find(
      (p) => p.name === "local" && p.enabled
    );
    if (!localProvider) {
      throw AuthorizationError("Password authentication is not enabled");
    }

    const user = await User.findOne({
      where: {
        teamId: team.id,
        email: email.toLowerCase(),
      },
    });

    if (!user) {
      // Don't reveal whether user exists
      throw AuthorizationError("Invalid email or password");
    }

    // Get password hash from user (stored in a new field we'll add)
    const passwordHash = (user as any).passwordHash;
    if (!passwordHash) {
      throw AuthorizationError("Invalid email or password");
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      throw AuthorizationError("Invalid email or password");
    }

    if (user.isSuspended) {
      throw AuthorizationError("Your account has been suspended");
    }

    // Sign in the user
    await signIn(ctx, "local", {
      user,
      team,
      isNewTeam: false,
      isNewUser: false,
      client: Client.Web,
    });
  }
);

// Registration route (for first user / admin setup)
router.post(
  "local.register",
  rateLimiter(RateLimiterStrategy.TenPerHour),
  validate(T.LocalRegisterSchema),
  async (ctx: APIContext<T.LocalRegisterReq>) => {
    const { email, password, name } = ctx.input.body;

    // Only allow registration if no team exists (first run) or team allows it
    let team = await Team.findOne();
    const isFirstRun = !team;

    if (!isFirstRun) {
      // Check if registration is allowed
      const localProvider = await AuthenticationProvider.findOne({
        where: {
          name: "local",
          teamId: team!.id,
          enabled: true,
        },
      });
      if (!localProvider) {
        throw AuthorizationError(
          "Password authentication is not enabled for this team"
        );
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        ...(team ? { teamId: team.id } : {}),
      },
    });
    if (existingUser) {
      throw ValidationError("An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);

    if (isFirstRun) {
      // Create team and admin user
      team = await Team.create({
        name: "My Team",
        collaborativeEditing: false,
      });

      // Create the local auth provider
      await AuthenticationProvider.create({
        name: "local",
        providerId: "local",
        teamId: team.id,
        enabled: true,
      });
    }

    // Create user with password
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      teamId: team!.id,
      role: isFirstRun ? "admin" : "member",
      // Store password hash - we'll add this field via migration
      passwordHash,
    } as any);

    // Sign in the new user
    await signIn(ctx, "local", {
      user,
      team: team!,
      isNewTeam: isFirstRun,
      isNewUser: true,
      client: Client.Web,
    });
  }
);

export default router;
