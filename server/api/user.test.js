import TestServer from 'fetch-test-server';

import app from '..';
import { User } from '../models';

import { flushdb, seed, sequelize } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
beforeEach(seed);
afterAll(() => server.close());
afterAll(() => sequelize.close());

it('should return known user', async () => {
  const user = await User.findOne({
    where: {
      email: 'user1@example.com',
    },
  });

  const res = await server.post('/api/user.info', {
    body: { token: user.getJwtToken() },
  });
  const body = await res.json();

  expect(res.status).toEqual(200);
  expect(body).toMatchSnapshot();
});

it('should require authentication', async () => {
  const res = await server.post('/api/user.info');
  const body = await res.json();

  expect(res.status).toEqual(401);
  expect(body).toMatchSnapshot();
});
