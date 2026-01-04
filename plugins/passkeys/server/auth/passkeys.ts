import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import Router from "koa-router";
import type { Context } from "koa";
import { randomBytes } from "crypto";
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

const router = new Router();
const rpName = env.APP_NAME;
const CHALLENGE_EXPIRY = Minute.seconds * 5;

// Helper to get RP ID (domain)
const getRpID = (ctx: Context) =>
  // In development, we might be on localhost or a local domain.
  // In production, it should be the base domain.
  // For simplicity, we can use the hostname but strip port.
  ctx.request.hostname;

router.post(
  "passkeys.generateRegistrationOptions",
  auth(),
  async (ctx: APIContext) => {
    const user = ctx.state.auth.user;

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(ctx as any),
      userID: isoBase64URL.toBuffer(user.id),
      userName: user.email || user.name,
      // Don't exclude credentials, so we can detect if one is already registered (optional)
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
    });

    // Save challenge to Redis with user ID as key
    const challengeKey = `passkey:reg-challenge:${user.id}`;
    await Redis.defaultClient.set(
      challengeKey,
      options.challenge,
      "PX",
      CHALLENGE_EXPIRY * 1000
    );

    ctx.body = { data: options };
  }
);

router.post(
  "passkeys.verifyRegistration",
  auth(),
  validate(T.PasskeysVerifyRegistrationSchema),
  async (ctx: APIContext<T.PasskeysVerifyRegistrationReq>) => {
    const user = ctx.state.auth.user;
    const body = ctx.input.body;

    // Retrieve challenge from Redis
    const challengeKey = `passkey:reg-challenge:${user.id}`;
    const expectedChallenge = await Redis.defaultClient.get(challengeKey);

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
        expectedOrigin: `${ctx.protocol}://${ctx.request.host}`, // Origin includes port
        expectedRPID: getRpID(ctx as any),
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
      const name = generatePasskeyName(aaguid, userAgent, transports);

      // Check if already exists
      const existing = await UserPasskey.findOne({
        where: { credentialId: credentialIdBase64 },
      });

      if (existing) {
        if (existing.userId !== user.id) {
          throw ValidationError("Passkey already registered to another user");
        }
        // Update existing? Or just return success.
        existing.credentialPublicKey = Buffer.from(credentialPublicKey);
        existing.counter = counter;
        existing.name = name;
        existing.userAgent = userAgent;
        await existing.saveWithCtx(ctx);
      } else {
        await UserPasskey.createWithCtx(ctx, {
          userId: user.id,
          credentialId: credentialIdBase64,
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
          transports,
          name,
          userAgent,
        });
      }

      // Delete challenge from Redis
      await Redis.defaultClient.del(challengeKey);
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
      rpID: getRpID(ctx as any),
      userVerification: "preferred",
    });

    // Generate a unique challenge ID for this authentication attempt
    const challengeId = randomBytes(32).toString("hex");
    const challengeKey = `passkey:auth-challenge:${challengeId}`;
    await Redis.defaultClient.set(
      challengeKey,
      options.challenge,
      "PX",
      CHALLENGE_EXPIRY * 1000
    );

    ctx.body = { data: { ...options, challengeId } };
  }
);

router.post(
  "passkeys.verifyAuthentication",
  validate(T.PasskeysVerifyAuthenticationSchema),
  async (ctx: APIContext<T.PasskeysVerifyAuthenticationReq>) => {
    const body = ctx.input.body;
    const { challengeId } = body;

    if (!challengeId) {
      throw ValidationError("Challenge ID is required");
    }

    // Retrieve challenge from Redis
    const challengeKey = `passkey:auth-challenge:${challengeId}`;
    const expectedChallenge = await Redis.defaultClient.get(challengeKey);

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

    if (!passkey || !passkey.user) {
      throw ValidationError("Passkey not found");
    }

    const user = passkey.user;
    const team = user.team;

    if (!team) {
      throw ValidationError("Team not found");
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: `${ctx.protocol}://${ctx.request.host}`,
        expectedRPID: getRpID(ctx as any),
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.credentialPublicKey),
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error("passkeys: Authentication verification failed", err);
      throw ValidationError(err.message);
    }

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // Update counter
      passkey.counter = authenticationInfo.newCounter;
      await passkey.save();

      // Delete challenge from Redis
      await Redis.defaultClient.del(challengeKey);

      // Use the signIn utility which handles all sign-in logic
      await signIn(ctx, "passkeys", {
        user,
        team,
        isNewUser: false,
        isNewTeam: false,
        client: ctx.input.query.client ?? Client.Web,
      });
    } else {
      throw ValidationError("Verification failed");
    }
  }
);

export default router;
