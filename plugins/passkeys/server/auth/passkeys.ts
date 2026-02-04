import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import Router from "koa-router";
import { randomBytes } from "node:crypto";
import { User, UserPasskey, Team } from "@server/models";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import type { APIContext } from "@server/types";
import Logger from "@server/logging/Logger";
import Redis from "@server/storage/redis";
import { signIn } from "@server/utils/authentication";
import { generatePasskeyName } from "@shared/utils/passkeys";
import * as T from "./schema";
import { Client } from "@shared/types";
import { Minute } from "@shared/utils/time";
import { authorize } from "@server/policies";

const router = new Router();
const rpName = env.APP_NAME;
const CHALLENGE_EXPIRY_MS = Minute.ms * 5;

// Helper to get RP ID (domain) - for simplicity, we can use the hostname but strip port.
const getRpID = (ctx: APIContext) => ctx.request.hostname;

/**
 * Helper to get the expected origin for WebAuthn.
 * Properly handles non-standard ports by checking X-Forwarded-Port header.
 *
 * @param ctx - the API context.
 * @returns the expected origin (protocol://host:port).
 */
export const getExpectedOrigin = (ctx: APIContext): string => {
  const protocol = ctx.protocol;
  const hostname = ctx.request.hostname;

  // When behind a proxy with app.proxy = true, Koa uses X-Forwarded-Host
  // which typically doesn't include the port. We need to check X-Forwarded-Port.
  const forwardedPort = ctx.request.get("X-Forwarded-Port");

  // ctx.request.host includes port if present (e.g., "example.com:3000")
  // ctx.request.hostname excludes port (e.g., "example.com")
  const hostWithPort = ctx.request.host;

  // Determine if we need to add a port to the origin
  let origin = `${protocol}://${hostname}`;

  // Check if X-Forwarded-Port exists (when behind a proxy)
  if (forwardedPort) {
    const port = parseInt(forwardedPort, 10);
    // Only add port if it's not the default for the protocol
    if ((protocol === "https" && port !== 443) || (protocol === "http" && port !== 80)) {
      origin = `${protocol}://${hostname}:${port}`;
    }
  } else if (hostWithPort !== hostname) {
    // hostWithPort includes port, use it directly
    origin = `${protocol}://${hostWithPort}`;
  }

  return origin;
};

/**
 * Generate Redis key for registration challenge.
 *
 * @param userId - the user ID.
 * @returns the Redis key.
 */
const getRegistrationChallengeKey = (userId: string): string =>
  `passkey:reg-challenge:${userId}`;

/**
 * Generate Redis key for authentication challenge.
 *
 * @param challengeId - the challenge ID.
 * @returns the Redis key.
 */
const getAuthenticationChallengeKey = (challengeId: string): string =>
  `passkey:auth-challenge:${challengeId}`;

router.post(
  "passkeys.generateRegistrationOptions",
  auth(),
  async (ctx: APIContext) => {
    const { user } = ctx.state.auth;
    authorize(user, "createUserPasskey", user.team);

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(ctx),
      userID: isoBase64URL.toBuffer(user.id),
      userName: user.email || user.name,
      // Don't exclude credentials, so we can detect if one is already registered (optional)
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Save challenge to Redis with user ID as key
    await Redis.defaultClient.set(
      getRegistrationChallengeKey(user.id),
      options.challenge,
      "PX",
      CHALLENGE_EXPIRY_MS
    );

    ctx.body = { data: options };
  }
);

router.post(
  "passkeys.verifyRegistration",
  auth(),
  validate(T.PasskeysVerifyRegistrationSchema),
  async (ctx: APIContext<T.PasskeysVerifyRegistrationReq>) => {
    const { user } = ctx.state.auth;
    const body = ctx.input.body;
    authorize(user, "createUserPasskey", user.team);

    // Retrieve challenge from Redis
    const expectedChallenge = await Redis.defaultClient.get(
      getRegistrationChallengeKey(user.id)
    );

    if (!expectedChallenge) {
      throw ValidationError(
        "No registration challenge found or challenge expired"
      );
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: getExpectedOrigin(ctx),
        expectedRPID: getRpID(ctx),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error("passkeys: Registration verification failed", err);
      throw ValidationError(err.message);
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credential, aaguid } = registrationInfo;
      // credential.id is already a Base64URL string
      const credentialIdBase64 = credential.id;
      const credentialPublicKey = credential.publicKey;
      const counter = credential.counter;

      // Capture user agent and generate friendly name
      const userAgent = ctx.request.get("user-agent");
      const transports = body.response.transports || [];

      // Check if already exists
      const existing = await UserPasskey.findOne({
        where: { credentialId: credentialIdBase64 },
      });

      if (existing) {
        if (existing.userId !== user.id) {
          throw ValidationError("Passkey already registered to another user");
        }

        await existing.updateWithCtx(ctx, {
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
          userAgent,
          aaguid,
        });
      } else {
        await UserPasskey.createWithCtx(ctx, {
          userId: user.id,
          credentialId: credentialIdBase64,
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
          transports,
          name: generatePasskeyName(aaguid, userAgent, transports),
          userAgent,
          aaguid,
        });
      }

      // Delete challenge from Redis
      await Redis.defaultClient.del(getRegistrationChallengeKey(user.id));
      ctx.body = { data: { verified: true } };
    } else {
      throw ValidationError("Verification failed");
    }
  }
);

router.post(
  "passkeys.generateAuthenticationOptions",
  validate(T.PasskeysGenerateAuthenticationOptionsSchema),
  async (ctx: APIContext<T.PasskeysGenerateAuthenticationOptionsReq>) => {
    const options = await generateAuthenticationOptions({
      rpID: getRpID(ctx),
      userVerification: "preferred",
    });

    // Generate a unique challenge ID for this authentication attempt
    const challengeId = randomBytes(32).toString("hex");
    await Redis.defaultClient.set(
      getAuthenticationChallengeKey(challengeId),
      options.challenge,
      "PX",
      CHALLENGE_EXPIRY_MS
    );

    ctx.body = { data: { ...options, challengeId } };
  }
);

router.post(
  "passkeys.verifyAuthentication",
  validate(T.PasskeysVerifyAuthenticationSchema),
  async (ctx: APIContext<T.PasskeysVerifyAuthenticationReq>) => {
    const body = ctx.input.body;
    const { challengeId, client = Client.Web } = body;

    // Retrieve challenge from Redis
    const expectedChallenge = await Redis.defaultClient.get(
      getAuthenticationChallengeKey(challengeId)
    );

    if (!expectedChallenge) {
      throw ValidationError(
        "No authentication challenge found or challenge expired"
      );
    }

    const credentialId = body.id;
    const passkey = await UserPasskey.findOne({
      where: { credentialId },
      include: [
        {
          model: User,
          as: "user",
          include: [{ model: Team, as: "team", required: true }],
        },
      ],
    });

    if (!passkey) {
      throw ValidationError(
        "Passkey not found. It may have been removed or registered on a different account."
      );
    }

    const user = passkey.user;
    const team = user.team;

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: getExpectedOrigin(ctx),
        expectedRPID: getRpID(ctx),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.credentialPublicKey),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (err) {
      Logger.error("passkeys: Authentication verification failed", err);
      throw ValidationError("Passkey authentication failed. Please try again.");
    }

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // Update counter
      passkey.counter = authenticationInfo.newCounter;
      passkey.lastActiveAt = new Date();
      await passkey.save({ silent: true });

      // Delete challenge from Redis
      await Redis.defaultClient.del(getAuthenticationChallengeKey(challengeId));

      // Use the signIn utility which handles all sign-in logic
      await signIn(ctx, "passkeys", {
        user,
        team,
        isNewUser: false,
        isNewTeam: false,
        client,
      });
    } else {
      throw ValidationError("Verification failed");
    }
  }
);

export default router;
