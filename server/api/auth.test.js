import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, sequelize, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(() => server.close());
afterAll(() => sequelize.close());

it('should signup a new user', async () => {
  const res = await server.post('/api/auth.signup', {
    body: {
      username: 'testuser',
      name: 'Test User',
      email: 'new.user@example.com',
      password: 'test123!',
    },
  });
  const body = await res.json();

  expect(res.status).toEqual(200);
  expect(body.ok).toBe(true);
  expect(body.data.user).toBeTruthy();
});

it('should require params', async () => {
  const res = await server.post('/api/auth.signup', {
    body: {
      username: 'testuser',
    },
  });
  const body = await res.json();

  expect(res.status).toEqual(400);
  expect(body).toMatchSnapshot();
});


it('should require valid email', async () => {
  const res = await server.post('/api/auth.signup', {
    body: {
      username: 'testuser',
      name: 'Test User',
      email: 'example.com',
      password: 'test123!',
    },
  });
  const body = await res.json();

  expect(res.status).toEqual(400);
  expect(body).toMatchSnapshot();
});

it('should require unique email', async () => {
  await seed();
  const res = await server.post('/api/auth.signup', {
    body: {
      username: 'testuser',
      name: 'Test User',
      email: 'user1@example.com',
      password: 'test123!',
    },
  });
  const body = await res.json();

  expect(res.status).toEqual(400);
  expect(body).toMatchSnapshot();
});

it('should require unique username', async () => {
  await seed();
  const res = await server.post('/api/auth.signup', {
    body: {
      username: 'user1',
      name: 'Test User',
      email: 'userone@example.com',
      password: 'test123!',
    },
  });
  const body = await res.json();

  expect(res.status).toEqual(400);
  expect(body).toMatchSnapshot();
});
