import Koa from "koa";
import Router from "koa-router";
import { NotFoundError } from "../errors";
import { Mailer } from "../mailer";

const emailPreviews = new Koa();
const router = new Router();

router.get("/:type/:format", async (ctx) => {
  let mailerOutput;
  const mailer = new Mailer();

  mailer.transporter = {
    // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'data' implicitly has an 'any' type.
    sendMail: (data) => (mailerOutput = data),
  };

  switch (ctx.params.type) {
    // case 'emailWithProperties':
    //   mailer.emailWithProperties('user@example.com', {...properties});
    //   break;
    default:
      if (Object.getOwnPropertyNames(mailer).includes(ctx.params.type)) {
        mailer[ctx.params.type]("user@example.com");
      } else {
        throw NotFoundError("Email template could not be found");
      }
  }

  if (!mailerOutput) {
    return;
  }

  if (ctx.params.format === "text") {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'text' does not exist on type 'never'.
    ctx.body = mailerOutput.text;
  } else {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'html' does not exist on type 'never'.
    ctx.body = mailerOutput.html;
  }
});
emailPreviews.use(router.routes());

export default emailPreviews;
