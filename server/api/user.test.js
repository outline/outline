/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';

import app from '..';
import { User } from '../models';

import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#user.info', async () => {
  it('should return known user', async () => {
    await seed();
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
    await seed();
    const res = await server.post('/api/user.info');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
