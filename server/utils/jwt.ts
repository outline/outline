import { subMinutes } from "date-fns";
import invariant from "invariant";
import JWT from "jsonwebtoken";
import Team from "@server/models/Team";
import User from "@server/models/User";
import { AuthenticationError } from "../errors";

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'token' implicitly has an 'any' type.
function getJWTPayload(token) {
  let payload;

  try {
    payload = JWT.decode(token);
  } catch (err) {
    throw AuthenticationError("Unable to decode JWT token");
  }

  if (!payload) {
    throw AuthenticationError("Invalid token");
  }

  return payload;
}

export async function getUserForJWT(token: string): Promise<User> {
  const payload = getJWTPayload(token);

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type === "email-signin") {
    throw AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'expiresAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (payload.expiresAt) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'expiresAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (new Date(payload.expiresAt) < new Date()) {
      throw AuthenticationError("Expired token");
    }
  }

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'string | Jwt... Remove this comment to see the full error message
  const user = await User.findByPk(payload.id, {
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });
  invariant(user, "User not found");

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type === "transfer") {
    // If the user has made a single API request since the transfer token was
    // created then it's no longer valid, they'll need to sign in again.
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (user.lastActiveAt > new Date(payload.createdAt)) {
      throw AuthenticationError("Token has already been used");
    }
  }

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    throw AuthenticationError("Invalid token");
  }

  return user;
}

export async function getUserForEmailSigninToken(token: string): Promise<User> {
  const payload = getJWTPayload(token);

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type !== "email-signin") {
    throw AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (payload.createdAt) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (new Date(payload.createdAt) < subMinutes(new Date(), 10)) {
      throw AuthenticationError("Expired token");
    }
  }

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'string | Jwt... Remove this comment to see the full error message
  const user = await User.findByPk(payload.id, {
    include: [
      {
        model: Team,
        as: "team",
        required: true,
      },
    ],
  });
  invariant(user, "User not found");

  // if user has signed in at all since the token was created then
  // it's no longer valid, they'll need a new one.
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (user.lastSignedInAt > payload.createdAt) {
    throw AuthenticationError("Token has already been used");
  }

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    throw AuthenticationError("Invalid token");
  }

  return user;
}
