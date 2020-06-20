/* eslint-disable flowtype/require-valid-file-annotation */
import mailer from "./mailer";

describe("Mailer", () => {
  let fakeMailer = mailer;
  let sendMailOutput;

  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
    process.env.SMTP_FROM_EMAIL = "hello@example.com";
    jest.resetModules();

    fakeMailer.transporter = {
      sendMail: output => (sendMailOutput = output),
    };
  });

  test("#welcome", () => {
    fakeMailer.welcome({
      to: "user@example.com",
      teamUrl: "http://example.com",
    });
    expect(sendMailOutput).toMatchSnapshot();
  });
});
