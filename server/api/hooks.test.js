/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import Authentication from '../models/Authentication';
import { flushdb, seed } from '../test/support';
import * as Slack from '../slack';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

jest.mock('../slack', () => ({
  post: jest.fn(),
}));

describe('#hooks.unfurl', async () => {
  it('should return documents', async () => {
    const { user, document } = await seed();
    await Authentication.create({
      serviceId: 'slack',
      userId: user.id,
      teamId: user.teamId,
      token: '',
    });

    const res = await server.post('/api/hooks.unfurl', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'link_shared',
          channel: 'Cxxxxxx',
          user: user.slackId,
          message_ts: '123456789.9875',
          links: [
            {
              domain: 'getoutline.com',
              url: document.getUrl(),
            },
          ],
        },
      },
    });
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalled();
  });
});
