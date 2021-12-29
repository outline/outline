import mailer from "./mailer";

describe("Mailer", () => {
  const fakeMailer = mailer;
  let sendMailOutput: any;

  beforeEach(() => {
    process.env.URL = "http://localhost:3000";
    process.env.SMTP_FROM_EMAIL = "hello@example.com";
    jest.resetModules();
    fakeMailer.transporter = {
      sendMail: (output: any) => (sendMailOutput = output),
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
