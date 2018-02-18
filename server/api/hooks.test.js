/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { Authentication } from '../models';
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

describe('#hooks.slack', async () => {
  it('should return no matches', async () => {
    const { user } = await seed();

    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.slackId,
        text: 'dsfkndfskndsfkn',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments).toEqual(undefined);
  });

  it('should return search results', async () => {
    const { user, document, collection } = await seed();

    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.slackId,
        text: document.title,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].footer).toEqual(collection.name);
  });

  it('should error if unknown user', async () => {
    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: 'not-a-user-id',
        text: 'Welcome',
      },
    });
    expect(res.status).toEqual(400);
  });

  it('should error if incorrect verification token', async () => {
    const { user } = await seed();

    const res = await server.post('/api/hooks.slack', {
      body: {
        token: 'wrong-verification-token',
        user_id: user.slackId,
        text: 'Welcome',
      },
    });
    expect(res.status).toEqual(401);
  });
});
