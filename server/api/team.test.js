/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';

import app from '..';

import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#team.users', async () => {
  it('should return teams paginated user list', async () => {
    const { admin } = await seed();

    const res = await server.post('/api/team.users', {
      body: { token: admin.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin for detailed info', async () => {
    const { user } = await seed();
    const res = await server.post('/api/team.users', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });
});
