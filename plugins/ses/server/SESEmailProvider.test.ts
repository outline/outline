import nodemailer from "nodemailer";
import env from "./env";
import { SESEmailProvider } from "./SESEmailProvider";

const { mockSend, mockClientConstructor } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockClientConstructor: vi.fn(),
}));

// The client is instantiated with `new` through a dynamic import, so it has to
// be a real class rather than a mock constructor.
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: class MockSESv2Client {
    constructor(config: { region?: string }) {
      mockClientConstructor(config);
    }

    send = mockSend;
  },
  SendEmailCommand: class MockSendEmailCommand {
    constructor(public input: Record<string, never>) {}
  },
}));

const send = (provider = new SESEmailProvider()) =>
  nodemailer.createTransport(provider).sendMail({
    from: "Outline <outline@example.com>",
    to: "user@example.com",
    subject: "Welcome to Outline",
    text: "Hello there",
    html: "<p>Hello there</p>",
  });

/** The input of the SendEmailCommand passed to the most recent send. */
const lastCommandInput = () => mockSend.mock.calls.at(-1)?.[0].input;

describe("SESEmailProvider", () => {
  const original = {
    AWS_SES_REGION: env.AWS_SES_REGION,
    AWS_SES_CONFIGURATION_SET: env.AWS_SES_CONFIGURATION_SET,
  };

  beforeEach(() => {
    mockSend.mockReset().mockResolvedValue({ MessageId: "message-id" });
    mockClientConstructor.mockReset();
    env.AWS_SES_REGION = "us-east-1";
    env.AWS_SES_CONFIGURATION_SET = undefined;
  });

  afterEach(() => {
    Object.assign(env, original);
  });

  it("should send the assembled message as raw MIME", async () => {
    await send();

    expect(mockSend).toHaveBeenCalledTimes(1);
    const mime = Buffer.from(lastCommandInput().Content.Raw.Data).toString(
      "utf-8"
    );
    expect(mime).toContain("Subject: Welcome to Outline");
    expect(mime).toContain("From: Outline <outline@example.com>");
    expect(mime).toContain("<p>Hello there</p>");
  });

  it("should deliver to bcc recipients without exposing them", async () => {
    await nodemailer.createTransport(new SESEmailProvider()).sendMail({
      from: "Outline <outline@example.com>",
      to: "user@example.com",
      bcc: "hidden@example.com",
      subject: "Welcome to Outline",
      text: "Hello there",
    });

    const input = lastCommandInput();

    // Delivery happens via the envelope, which includes bcc recipients…
    expect(input.Destination.ToAddresses).toContain("hidden@example.com");

    // …while the message itself must not reveal them to other recipients.
    const mime = Buffer.from(input.Content.Raw.Data).toString("utf-8");
    expect(mime).not.toContain("hidden@example.com");
  });

  it("should take the sender and recipients from the envelope", async () => {
    await send();

    expect(lastCommandInput()).toMatchObject({
      FromEmailAddress: "outline@example.com",
      Destination: { ToAddresses: ["user@example.com"] },
    });
  });

  it("should not set a configuration set unless one is configured", async () => {
    await send();

    expect(lastCommandInput().ConfigurationSetName).toBeUndefined();
  });

  it("should pass the configured configuration set", async () => {
    env.AWS_SES_CONFIGURATION_SET = "outline-events";

    await send();

    expect(lastCommandInput().ConfigurationSetName).toBe("outline-events");
  });

  it("should create the client in the configured region", async () => {
    env.AWS_SES_REGION = "eu-west-1";

    await send();

    expect(mockClientConstructor).toHaveBeenCalledWith({ region: "eu-west-1" });
  });

  it("should tag messages with the header SES reads on raw sends", () => {
    expect(
      new SESEmailProvider().tagHeaders({
        category: "notification",
        template: "InviteEmail",
      })
    ).toEqual({
      "X-SES-MESSAGE-TAGS": "category=notification, template=InviteEmail",
    });
  });

  it("should propagate errors so the message can be retried", async () => {
    mockSend.mockRejectedValue(new Error("Email address is not verified"));

    await expect(send()).rejects.toThrow("Email address is not verified");
  });
});
