import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(() => server.close());

describe('#auth.signup', async () => {
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
});

describe('#auth.login', () => {
  test('should login with email', async () => {
    await seed();
    const res = await server.post('/api/auth.login', {
      body: {
        username: 'user1@example.com',
        password: 'test123!',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.ok).toBe(true);
    expect(body.data.user).toMatchSnapshot();
  });

  test('should login with username', async () => {
    await seed();
    const res = await server.post('/api/auth.login', {
      body: {
        username: 'user1',
        password: 'test123!',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.ok).toBe(true);
    expect(body.data.user).toMatchSnapshot();
  });

  test('should validate password', async () => {
    await seed();
    const res = await server.post('/api/auth.login', {
      body: {
        email: 'user1@example.com',
        password: 'bad_password',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  test('should require either username or email', async () => {
    const res = await server.post('/api/auth.login', {
      body: {
        password: 'test123!',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  test('should require password', async () => {
    await seed();
    const res = await server.post('/api/auth.login', {
      body: {
        email: 'user1@example.com',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });
});
