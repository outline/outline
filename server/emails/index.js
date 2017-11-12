// @flow
import Koa from 'koa';
import Router from 'koa-router';
import { Mailer } from '../mailer';

const emailPreviews = new Koa();
const router = new Router();

router.get('/:type/:format', async ctx => {
  const previewMailer = new Mailer();
  let mailerOutput;
  previewMailer.transporter = {
    sendMail: data => (mailerOutput = data),
  };

  switch (ctx.params.type) {
    case 'welcome':
      previewMailer.welcome('user@example.com');
      break;
    default:
      console.log(1);
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
