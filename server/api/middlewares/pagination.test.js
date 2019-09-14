/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../../app';
import { flushdb, seed } from '../../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#pagination', async () => {
  it('should allow offset and limit', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken(), limit: 1, offset: 1 },
    });

    expect(res.status).toEqual(200);
  });

  it('should not allow negative limit', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken(), limit: -1 },
    });

    expect(res.status).toEqual(400);
  });

  it('should not allow non-integer limit', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken(), limit: 'blah' },
    });

    expect(res.status).toEqual(400);
  });

  it('should not allow negative offset', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken(), offset: -1 },
    });

    expect(res.status).toEqual(400);
  });

  it('should not allow non-integer offset', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken(), offset: 'blah' },
    });

    expect(res.status).toEqual(400);
  });
});
