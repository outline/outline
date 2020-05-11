// @flow
import Sequelize from 'sequelize';
import crypto from 'crypto';
import Router from 'koa-router';
import { capitalize } from 'lodash';
import ClientOAuth2 from 'client-oauth2'
import { User, Team, Event } from '../models';
import auth from '../middlewares/authentication';
import url from 'url';

const Op = Sequelize.Op;

const router = new Router();

const giteaAuth = new ClientOAuth2({
    clientId: process.env.GITEA_KEY,
    clientSecret: process.env.GITEA_SECRET,
    accessTokenUri: `${process.env.GITEA_URL}/login/oauth/access_token`,
    authorizationUri: `${process.env.GITEA_URL}/login/oauth/authorize`,
    redirectUri: `${process.env.URL}/auth/gitea.callback`
})

// start the oauth process and redirect user to Gitea
router.get('gitea', async ctx => {
    // Generate the url that will be used for the consent dialog
    const authorizeUrl = giteaAuth.code.getUri()
    ctx.redirect(authorizeUrl);
});

// signin callback from Gitea
router.get('gitea.callback', auth({ required: false }), async ctx => {
    const client = await giteaAuth.code.getToken(`${process.env.URL}/auth${ctx.request.url}`)
    
    const requestSettings = await client.sign({
        method:"GET",
        url: `${process.env.GITEA_URL}/api/v1/user`
    })

    let profile;
    const response = await fetch(requestSettings.url, {headers: requestSettings.headers});
    profile = await response.json();

    // currently team is based on gitea install
    const [team, isFirstUser] = await Team.findOrCreate({
        where: {
            giteaId: process.env.GITEA_URL,
        },
        defaults: {
            name: "Gitea Team",
            avatarUrl: "https://avatars0.githubusercontent.com/u/12724356?s=200&v=4",
            giteaId: process.env.GITEA_URL,
        },
    });

    try {
        const [user, isFirstSignin] = await User.findOrCreate({
            where: {
                [Op.or]: [
                    {
                        service: 'gitea',
                        serviceId: profile.id.toString(),
                    },
                    {
                        service: { [Op.eq]: null },
                        email: profile.email,
                    },
                ],
                teamId: team.id,
            },
            defaults: {
                service: 'gitea',
                serviceId: profile.id.toString(),
                name: profile.full_name,
                email: profile.email,
                isAdmin: isFirstUser,
                avatarUrl: profile.avatar_url,
            },
        });

        // update the user with fresh details if they just accepted an invite
        if (!user.serviceId || !user.service) {
            await user.update({
                service: 'gitea',
                serviceId: profile.id.toString(),
                avatarUrl: profile.avatar_url,
            });
        }
        // update email address if it's changed in Google
        if (!isFirstSignin && profile.email !== user.email) {
            await user.update({ email: profile.email });
        }
        if (isFirstUser) {
            await team.provisionFirstCollection(user.id);
            await team.provisionSubdomain(url.parse(process.env.GITEA_URL).hostname);
        }
        if (isFirstSignin) {
            await Event.create({
                name: 'users.create',
                actorId: user.id,
                userId: user.id,
                teamId: team.id,
                data: {
                    name: user.name,
                    service: 'gitea',
                },
                ip: ctx.request.ip,
            });
        }
        // set cookies on response and redirect to team subdomain
        ctx.signIn(user, team, 'gitea', isFirstSignin);
    } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
            const exists = await User.findOne({
                where: {
                    service: 'email',
                    email: profile.email,
                    teamId: team.id,
                },
            });

            if (exists) {
                ctx.redirect(`${team.url}?notice=email-auth-required`);
            } else {
                console.log(err)
                ctx.redirect(`${team.url}?notice=auth-error`);
            }

            return;
        }

        throw err;
    }
});

export default router;
