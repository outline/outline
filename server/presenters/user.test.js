/* eslint-disable flowtype/require-valid-file-annotation */
import presentUser from './user';
import ctx from '../../__mocks__/ctx';

it('presents a user', async () => {
  const user = await presentUser(ctx, {
    id: '123',
    name: 'Test User',
    username: 'testuser',
    slackData: {
      image_192: 'http://example.com/avatar.png',
    },
  });

  expect(user).toMatchSnapshot();
});

it('presents a user without slack data', async () => {
  const user = await presentUser(ctx, {
    id: '123',
    name: 'Test User',
    username: 'testuser',
    slackData: null,
  });

  expect(user).toMatchSnapshot();
});
