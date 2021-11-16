import mailer from "./mailer";

describe("Mailer", () => {
  const fakeMailer = mailer;
  // @ts-expect-error ts-migrate(7034) FIXME: Variable 'sendMailOutput' implicitly has type 'any... Remove this comment to see the full error message
  let sendMailOutput;
  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
    process.env.SMTP_FROM_EMAIL = "hello@example.com";
    jest.resetModules();
    fakeMailer.transporter = {
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'output' implicitly has an 'any' type.
      sendMail: (output) => (sendMailOutput = output),
    };
  });
  test("#welcome", () => {
    fakeMailer.welcome({
      to: "user@example.com",
      teamUrl: "http://example.com",
    });
    // @ts-expect-error ts-migrate(7005) FIXME: Variable 'sendMailOutput' implicitly has an 'any' ... Remove this comment to see the full error message
    expect(sendMailOutput).toMatchSnapshot();
  });
});
