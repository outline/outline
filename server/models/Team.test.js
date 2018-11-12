/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildTeam } from '../test/factories';

beforeEach(flushdb);

it('should set subdomain if available', async () => {
  const team = await buildTeam();
  const subdomain = await team.provisionSubdomain('testy');
  expect(subdomain).toEqual('testy');
  expect(team.subdomain).toEqual('testy');
});

it('should set subdomain with append if unavailable', async () => {
  await buildTeam({ subdomain: 'myteam' });

  const team = await buildTeam();
  const subdomain = await team.provisionSubdomain('myteam');
  expect(subdomain).toEqual('myteam1');
  expect(team.subdomain).toEqual('myteam1');
});

it('should do nothing if subdomain already set', async () => {
  const team = await buildTeam({ subdomain: 'example' });
  const subdomain = await team.provisionSubdomain('myteam');
  expect(subdomain).toEqual('example');
  expect(team.subdomain).toEqual('example');
});
