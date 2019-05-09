/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from './app';
import { flushdb } from './test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#index', async () => {
  it('should render homepage', async () => {
    const res = await server.get('/');
    const html = await res.text();
    expect(res.status).toEqual(200);
    expect(html.includes('Our team’s knowledge base')).toEqual(true);
  });

  it('should render app if there is an accessToken', async () => {
    const res = await server.get('/', {
      headers: { Cookie: ['accessToken=12345667'] },
    });
    const html = await res.text();
    expect(res.status).toEqual(200);
    expect(html.includes('id="root"')).toEqual(true);
  });
});
