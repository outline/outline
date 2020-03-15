/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb } from '../test/support';
import { buildUser, buildGroup } from '../test/factories';
import { Event } from '../models';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#groups.create', async () => {
  it('should create a group', async () => {
    const name = 'hello I am a group';
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.create', {
      body: { token: user.getJwtToken(), name },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(name);
  });
});

describe('#groups.update', async () => {
  it('should require authentication', async () => {
    const group = await buildGroup();
    const res = await server.post('/api/groups.update', {
      body: { id: group.id, name: 'Test' },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post('/api/groups.update', {
      body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const group = await buildGroup();
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.update', {
      body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
    });
    expect(res.status).toEqual(403);
  });

  describe('when user is admin', async () => {
    let user, group;

    beforeEach(async () => {
      user = await buildUser({ isAdmin: true });
      group = await buildGroup({ teamId: user.teamId });
    });

    it('allows admin to edit a group', async () => {
      const res = await server.post('/api/groups.update', {
        body: { token: user.getJwtToken(), id: group.id, name: 'Test' },
      });

      const events = await Event.findAll();
      expect(events.length).toEqual(1);

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.name).toBe('Test');
    });

    it('does not create an event if the update is a noop', async () => {
      const res = await server.post('/api/groups.update', {
        body: { token: user.getJwtToken(), id: group.id, name: group.name },
      });

      const events = await Event.findAll();
      expect(events.length).toEqual(0);

      const body = await res.json();
      expect(res.status).toEqual(200);
      expect(body.data.name).toBe(group.name);
    });

    it('fails with validation error when name already taken', async () => {
      await buildGroup({
        teamId: user.teamId,
        name: 'test',
      });

      const res = await server.post('/api/groups.update', {
        body: {
          token: user.getJwtToken(),
          id: group.id,
          name: 'TEST',
        },
      });

      const body = await res.json();
      expect(res.status).toEqual(400);
      expect(body).toMatchSnapshot();
    });
  });
});

describe('#groups.list', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/groups.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should return groups with memberships preloaded', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

    await group.addUser(user, { through: { createdById: user.id } });

    const res = await server.post('/api/groups.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);

    expect(body.data['groups'].length).toEqual(1);
    expect(body.data['groups'][0].id).toEqual(group.id);

    expect(body.data['groupMemberships'].length).toEqual(1);
    expect(body.data['groupMemberships'][0].groupId).toEqual(group.id);
    expect(body.data['groupMemberships'][0].user.id).toEqual(user.id);

    expect(body.policies.length).toEqual(1);
    expect(body.policies[0].abilities.read).toEqual(true);
  });
});

describe('#groups.info', async () => {
  it('should return group if admin', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it('should return group if member', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });
    await group.addUser(user, { through: { createdById: user.id } });

    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(group.id);
  });

  it('should not return group if non-member, non-admin', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    expect(res.status).toEqual(403);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.info');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const user = await buildUser();
    const group = await buildGroup();
    const res = await server.post('/api/groups.info', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#groups.delete', async () => {
  it('should require authentication', async () => {
    const group = await buildGroup();
    const res = await server.post('/api/groups.delete', {
      body: { id: group.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const group = await buildGroup();
    const user = await buildUser();
    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const group = await buildGroup();
    const user = await buildUser({ isAdmin: true });

    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });

  it('allows admin to delete a group', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({ teamId: user.teamId });

    const res = await server.post('/api/groups.delete', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});

describe('#groups.memberships', async () => {
  it('should return members in a group', async () => {
    const user = await buildUser();
    const group = await buildGroup({ teamId: user.teamId });

    await group.addUser(user, { through: { createdById: user.id } });

    const res = await server.post('/api/groups.memberships', {
      body: { token: user.getJwtToken(), id: group.id },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
    expect(body.data.groupMemberships.length).toEqual(1);
    expect(body.data.groupMemberships[0].user.id).toEqual(user.id);
  });

  it('should allow filtering members in group by name', async () => {
    const user = await buildUser();
    const user2 = await buildUser({ name: "Won't find" });
    const group = await buildGroup({ teamId: user.teamId });

    await group.addUser(user, { through: { createdById: user.id } });
    await group.addUser(user2, { through: { createdById: user.id } });

    const res = await server.post('/api/groups.memberships', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        query: user.name.slice(0, 3),
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.users.length).toEqual(1);
    expect(body.data.users[0].id).toEqual(user.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.memberships');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const user = await buildUser();
    const group = await buildGroup();

    const res = await server.post('/api/groups.memberships', {
      body: { token: user.getJwtToken(), id: group.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#groups.add_user', async () => {
  it('should add user to group', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({
      teamId: user.teamId,
    });

    const res = await server.post('/api/groups.add_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });

    const users = await group.getUsers();
    expect(res.status).toEqual(200);
    expect(users.length).toEqual(1);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.add_user');
    expect(res.status).toEqual(401);
  });

  it('should require user in team', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser();

    const res = await server.post('/api/groups.add_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser({ teamId: user.teamId });

    const res = await server.post('/api/groups.add_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });

    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});

describe('#groups.remove_user', async () => {
  it('should remove user from group', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({
      teamId: user.teamId,
    });

    await server.post('/api/groups.add_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });

    const users = await group.getUsers();
    expect(users.length).toEqual(1);

    const res = await server.post('/api/groups.remove_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: user.id,
      },
    });

    const users1 = await group.getUsers();
    expect(res.status).toEqual(200);
    expect(users1.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/groups.remove_user');

    expect(res.status).toEqual(401);
  });

  it('should require user in team', async () => {
    const user = await buildUser({ isAdmin: true });
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser();

    const res = await server.post('/api/groups.remove_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it('should require admin', async () => {
    const user = await buildUser();
    const group = await buildGroup({
      teamId: user.teamId,
    });
    const anotherUser = await buildUser({
      teamId: user.teamId,
    });

    const res = await server.post('/api/groups.remove_user', {
      body: {
        token: user.getJwtToken(),
        id: group.id,
        userId: anotherUser.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });
});
