// @flow
import crypto from 'crypto';
import Router from 'koa-router';
import { AuthenticationContext } from 'adal-node';
import {
  AuthenticationProvider,
  Client,
} from '@microsoft/microsoft-graph-client';
import { User, Team, Event } from '../models';
import auth from '../middlewares/authentication';

class AzureADProvider implements AuthenticationProvider {
  constructor(code) {
    this._code = code;
  }

  set code(code) {
    this._code = code;
  }

  get code() {
    return this._code;
  }

  getAccessToken() {
    var self = this;
    return new Promise((resolve, reject) => {
      resolve(self._code);
    });
  }
}

const router = new Router();

var clientId = process.env.AZUREAD_CLIENT_ID;
var clientSecret = process.env.AZUREAD_CLIENT_SECRET;
var authorityHostUrl = 'https://login.microsoftonline.com/';
var tenant = process.env.AZUREAD_TENANT_ID;
var authorityUrl = authorityHostUrl + tenant;
var redirectUri = `${process.env.URL}/auth/azuread.callback`;
var templateAuthzUrl = `${
  authorityUrl
}//oauth2/authorize?response_type=code&client_id=${clientId}&&redirect_uri=${
  redirectUri
}&state=<state>`;

var createAuthorizationUrl = state => {
  return templateAuthzUrl.replace('<state>', state);
};

var aqcuireTokenAsync = (code, redirectUri, clientId, clientSecret) => {
  return new Promise((resolve, reject) => {
    var authenticationContext = new AuthenticationContext(authorityUrl);
    authenticationContext.acquireTokenWithAuthorizationCode(
      code,
      redirectUri,
      'https://graph.microsoft.com',
      clientId,
      clientSecret,
      (err, response) => {
        if (err) {
          reject(err);
        }

        resolve(response);
      }
    );
  });
};

// start the oauth process and redirect user to Microsoft AzureAD
router.get('azuread', async ctx => {
  const buffer = await crypto.randomBytes(48);
  const token = buffer
    .toString('base64')
    .replace(/\//g, '_')
    .replace(/\+/g, '-');
  ctx.cookies.set('authstate', token);
  var authorizationUrl = createAuthorizationUrl(token);
  ctx.redirect(authorizationUrl);
});

// signin callback from Microsoft AzureAD
router.get('azuread.callback', auth({ required: false }), async ctx => {
  const { code, state } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');

  if (ctx.cookies.get('authstate') !== state) {
    ctx.redirect('/?notice=auth-error');
    return;
  }

  var response = await aqcuireTokenAsync(
    code,
    redirectUri,
    clientId,
    clientSecret
  );

  if (!response) {
    ctx.redirect('/?notice=auth-error');
    return;
  }

  const accessToken = response.accessToken;
  const clientOptions = {
    authProvider: new AzureADProvider(accessToken),
  };

  const client = Client.initWithMiddleware(clientOptions);

  let userId = '';
  let azureId = '';
  let hashedOrganizationId = '';
  let teamName = '';
  let userName = '';
  let userEmail = '';
  let userAvatar = '';

  try {
    try {
      const orgResource = await client.api('/organization').get();

      if (!orgResource) {
        ctx.redirect('/?notice=azuread-no-organization');
        return;
      }

      const hash = crypto.createHash('sha256');
      hash.update(orgResource.value[0].id);
      azureId = orgResource.value[0].id;
      hashedOrganizationId = hash.digest('hex');
      teamName = orgResource.value[0].displayName;
    } catch (error) {
      throw error;
    }

    const userResource = await client.api('/me').get();

    if (!userResource) {
      ctx.redirect('/?notice=azuread-no-userinfo');
      return;
    }

    userId = userResource.id;
    userName = userResource.displayName;
    userEmail = userResource.mail || userResource.userPrincipalName;
    userAvatar = `https://tiley.herokuapp.com/avatar/${hashedOrganizationId}/${
      userName[0]
    }.png`;
  } catch (error) {
    throw error;
  }

  const tileyUrl = `https://tiley.herokuapp.com/avatar/${
    hashedOrganizationId
  }/${teamName[0]}.png`;
  const avatarUrl = tileyUrl;

  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      azureId,
    },
    defaults: {
      name: teamName,
      avatarUrl,
    },
  });

  const [user, isFirstSignin] = await User.findOrCreate({
    where: {
      service: 'azuread',
      serviceId: userId,
      teamId: team.id,
    },
    defaults: {
      name: userName,
      email: userEmail,
      isAdmin: isFirstUser,
      avatarUrl: userAvatar,
    },
  });

  if (isFirstSignin) {
    await Event.create({
      name: 'users.create',
      actorId: user.id,
      userId: user.id,
      teamId: team.id,
      data: {
        name: user.name,
        service: 'azuread',
      },
      ip: ctx.request.ip,
    });
  }

  // update email address if it's changed in Azure AD
  if (!isFirstSignin && userEmail !== user.email) {
    await user.update({ email: userEmail });
  }

  if (isFirstUser) {
    await team.provisionFirstCollection(user.id);
    await team.provisionSubdomain(teamName);
  }

  ctx.signIn(user, team, 'azuread', isFirstSignin);
});

export default router;
