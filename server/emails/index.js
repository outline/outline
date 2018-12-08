// @flow
import Koa from 'koa';
import Router from 'koa-router';
import { NotFoundError } from '../errors';
import { Mailer } from '../mailer';

const emailPreviews = new Koa();
const router = new Router();

router.get('/:type/:format', async ctx => {
  let mailerOutput;
  let mailer = new Mailer();
  mailer.transporter = {
    sendMail: data => (mailerOutput = data),
  };

  switch (ctx.params.type) {
    // case 'emailWithProperties':
    //   mailer.emailWithProperties('user@example.com', {...properties});
    //   break;
    default:
      if (Object.getOwnPropertyNames(mailer).includes(ctx.params.type)) {
        // $FlowIssue flow doesn't like this but we're ok with it
        mailer[ctx.params.type]('user@example.com');
      } else throw new NotFoundError('Email template could not be found');
  }

  if (!mailerOutput) return;

  if (ctx.params.format === 'text') {
    ctx.body = mailerOutput.text;
  } else {
    ctx.body = mailerOutput.html;
  }
});

emailPreviews.use(router.routes());

export default emailPreviews;
