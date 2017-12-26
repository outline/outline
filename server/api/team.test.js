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

  it('should require admin', async () => {
    const { user } = await seed();
    const res = await server.post('/api/team.users', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#team.addAdmin', async () => {
  it('should promote a new admin', async () => {
    const { admin, user } = await seed();

    const res = await server.post('/api/team.addAdmin', {
      body: {
        token: admin.getJwtToken(),
        user: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const { user } = await seed();
    const res = await server.post('/api/team.addAdmin', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#team.removeAdmin', async () => {
  it('should demote an admin', async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post('/api/team.removeAdmin', {
      body: {
        token: admin.getJwtToken(),
        user: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("shouldn't demote admins if only one available ", async () => {
    const { admin } = await seed();

    const res = await server.post('/api/team.removeAdmin', {
      body: {
        token: admin.getJwtToken(),
        user: admin.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const { user } = await seed();
    const res = await server.post('/api/team.addAdmin', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});
