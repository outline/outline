import { subMinutes } from "date-fns";
import JWT from "jsonwebtoken";
import { AuthenticationError } from "../errors";
import { Team, User } from "../models";

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'token' implicitly has an 'any' type.
function getJWTPayload(token) {
  let payload;

  try {
    payload = JWT.decode(token);
  } catch (err) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Unable to decode JWT token");
  }

  if (!payload) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Invalid token");
  }

  return payload;
}

// @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
export async function getUserForJWT(token: string): Promise<User> {
  const payload = getJWTPayload(token);

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type === "email-signin") {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'expiresAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (payload.expiresAt) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'expiresAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (new Date(payload.expiresAt) < new Date()) {
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new AuthenticationError("Expired token");
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

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type === "transfer") {
    // If the user has made a single API request since the transfer token was
    // created then it's no longer valid, they'll need to sign in again.
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (user.lastActiveAt > new Date(payload.createdAt)) {
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new AuthenticationError("Token has already been used");
    }
  }

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Invalid token");
  }

  return user;
}

// @ts-expect-error ts-migrate(2749) FIXME: 'User' refers to a value, but is being used as a t... Remove this comment to see the full error message
export async function getUserForEmailSigninToken(token: string): Promise<User> {
  const payload = getJWTPayload(token);

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'string | J... Remove this comment to see the full error message
  if (payload.type !== "email-signin") {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Invalid token");
  }

  // check the token is within it's expiration time
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (payload.createdAt) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
    if (new Date(payload.createdAt) < subMinutes(new Date(), 10)) {
      // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
      throw new AuthenticationError("Expired token");
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

  // if user has signed in at all since the token was created then
  // it's no longer valid, they'll need a new one.
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'createdAt' does not exist on type 'strin... Remove this comment to see the full error message
  if (user.lastSignedInAt > payload.createdAt) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Token has already been used");
  }

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
    throw new AuthenticationError("Invalid token");
  }

  return user;
}
