// @flow
import JWT from 'jsonwebtoken';
import { AuthenticationError } from '../errors';
import { User } from '../models';

export async function getUserForJWT(token: string) {
  let payload;
  try {
    payload = JWT.decode(token);
  } catch (err) {
    throw new AuthenticationError('Unable to decode JWT token');
  }

  if (!payload) throw new AuthenticationError('Invalid token');

  const user = await User.findByPk(payload.id);

  try {
    JWT.verify(token, user.jwtSecret);
  } catch (err) {
    throw new AuthenticationError('Invalid token');
  }

  return user;
}
