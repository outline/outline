// @flow
import JWT from 'jsonwebtoken';
import subMinutes from 'date-fns/sub_minutes';
import { AuthenticationError } from '../errors';
import { User } from '../models';

function getJWTPayload(token) {
  let payload;
  try {
    payload = JWT.decode(token);
  } catch (err) {
    throw new AuthenticationError('Unable to decode JWT token');
  }

  if (!payload) {
    throw new AuthenticationError('Invalid token');
  }
  return payload;
}

export async function getUserForJWT(token: string) {
  const payload = getJWTPayload(token);
  const user = await User.findByPk(payload.id);

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    throw new AuthenticationError('Invalid token');
  }

  return user;
}

export async function getUserForEmailSigninToken(token: string) {
  const payload = getJWTPayload(token);

  if (payload.createdAt) {
    if (new Date(payload.createdAt) < subMinutes(new Date(), 10)) {
      throw new AuthenticationError('Expired token');
    }
  }

  const user = await User.findByPk(payload.id);

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    throw new AuthenticationError('Invalid token');
  }

  return user;
}
