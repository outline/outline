/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';

import { flushdb, seed } from '../test/support';
import { buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#user.info', async () => {
  it('should return known user', async () => {
    const user = await buildUser();
    const res = await server.post('/api/user.info', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(user.id);
    expect(body.data.name).toEqual(user.name);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/user.info');
    expect(res.status).toEqual(401);
  });
});

describe('#user.delete', async () => {
  it('should not allow deleting without confirmation', async () => {
    const user = await buildUser();
    const res = await server.post('/api/user.delete', {
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(400);
  });

  it('should allow deleting last admin if only user', async () => {
    const user = await buildUser({ isAdmin: true });
    const res = await server.post('/api/user.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it('should not allow deleting last admin if many users', async () => {
    const user = await buildUser({ isAdmin: true });
    await buildUser({ teamId: user.teamId, isAdmin: false });

    const res = await server.post('/api/user.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(400);
  });

  it('should allow deleting user account with confirmation', async () => {
    const user = await buildUser();
    const res = await server.post('/api/user.delete', {
      body: { token: user.getJwtToken(), confirmation: true },
    });
    expect(res.status).toEqual(200);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/user.delete');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#user.update', async () => {
  it('should update user profile information', async () => {
    const { user } = await seed();
    const res = await server.post('/api/user.update', {
      body: { token: user.getJwtToken(), name: 'New name' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/user.update');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#user.promote', async () => {
  it('should promote a new admin', async () => {
    const { admin, user } = await seed();

    const res = await server.post('/api/user.promote', {
      body: { token: admin.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const res = await server.post('/api/user.promote', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#user.demote', async () => {
  it('should demote an admin', async () => {
    const { admin, user } = await seed();
    await user.update({ isAdmin: true }); // Make another admin

    const res = await server.post('/api/user.demote', {
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

    const res = await server.post('/api/user.demote', {
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
    const res = await server.post('/api/user.promote', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#user.suspend', async () => {
  it('should suspend an user', async () => {
    const { admin, user } = await seed();

    const res = await server.post('/api/user.suspend', {
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
    const res = await server.post('/api/user.suspend', {
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
    const res = await server.post('/api/user.suspend', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#user.activate', async () => {
  it('should activate a suspended user', async () => {
    const { admin, user } = await seed();
    await user.update({
      suspendedById: admin.id,
      suspendedAt: new Date(),
    });

    expect(user.isSuspended).toBe(true);
    const res = await server.post('/api/user.activate', {
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
    const res = await server.post('/api/user.activate', {
      body: { token: user.getJwtToken(), id: user.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});
