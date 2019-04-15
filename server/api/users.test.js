/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';

import { flushdb, seed } from '../test/support';
import { buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#users.list', async () => {
  it('should return teams paginated user list', async () => {
    const { admin } = await seed();

    const res = await server.post('/api/users.list', {
      body: { token: admin.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin for detailed info', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.info', async () => {
  it('should return known user', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.info', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(user.id);
    expect(body.data.name).toEqual(user.name);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/users.info');
    expect(res.status).toEqual(401);
  });
});

describe('#users.delete', async () => {
  it('should not allow deleting without confirmation', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.delete', {
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(400);
  });

  it('should allow deleting last admin if only user', async () => {
    const user = await buildUser({ isAdmin: true });
    const res = await server.post('/api/users.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it('should not allow deleting last admin if many users', async () => {
    const user = await buildUser({ isAdmin: true });
    await buildUser({ teamId: user.teamId, isAdmin: false });

    const res = await server.post('/api/users.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(400);
  });

  it('should allow deleting user account with confirmation', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/users.delete');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.update', async () => {
  it('should update user profile information', async () => {
    const { user } = await seed();
    const res = await server.post('/api/users.update', {
      body: { token: user.getJwtToken(), name: 'New name' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/users.update');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.promote', async () => {
  it('should promote a new admin', async () => {
    const { admin, user } = await seed();

    const res = await server.post('/api/users.promote', {
      body: { token: admin.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.promote', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.demote', async () => {
  it('should demote an admin', async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post('/api/users.demote', {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("shouldn't demote admins if only one available ", async () => {
    const admin = await buildUser({ isAdmin: true });

    const res = await server.post('/api/users.demote', {
      body: {
        token: admin.getJwtToken(),
        id: admin.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.promote', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.suspend', async () => {
  it('should suspend an user', async () => {
    const { admin, user } = await seed();

    const res = await server.post('/api/users.suspend', {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it("shouldn't allow suspending the user themselves", async () => {
    const admin = await buildUser({ isAdmin: true });
    const res = await server.post('/api/users.suspend', {
      body: {
        token: admin.getJwtToken(),
        id: admin.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.suspend', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#users.activate', async () => {
  it('should activate a suspended user', async () => {
    const { admin, user } = await seed();
    await user.update({
      suspendedById: admin.id,
      suspendedAt: new Date(),
    });

    expect(user.isSuspended).toBe(true);
    const res = await server.post('/api/users.activate', {
      body: {
        token: admin.getJwtToken(),
        id: user.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const res = await server.post('/api/users.activate', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});
