/* eslint-disable flowtype/require-valid-file-annotation */
import { Mailer } from './mailer';

describe('Mailer', () => {
  let fakeMailer;
  let sendMailOutput;

  beforeEach(() => {
    process.env.SMTP_FROM_EMAIL = 'hello@example.com';

    fakeMailer = new Mailer();
    fakeMailer.transporter = {
      sendMail: output => (sendMailOutput = output),
    };
  });

  test('#welcome', () => {
    fakeMailer.welcome({ to: 'user@example.com' });
    expect(sendMailOutput).toMatchSnapshot();
  });
});
