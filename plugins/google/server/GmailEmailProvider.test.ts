import crypto from "node:crypto";
import JWT from "jsonwebtoken";
import { http, HttpResponse } from "msw";
import nodemailer from "nodemailer";
import { server } from "@server/test/msw";
import Logger from "@server/logging/Logger";
import env from "./env";
import { GmailEmailProvider } from "./GmailEmailProvider";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const tokenEndpoint = "https://oauth2.googleapis.com/token";
const sendEndpoint =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

/** Stubs the token endpoint, returning the requests it received. */
const mockToken = (expiresIn = 3599) => {
  const requests: Record<string, string>[] = [];
  server.use(
    http.post(tokenEndpoint, async ({ request }) => {
      requests.push(
        Object.fromEntries(new URLSearchParams(await request.text()))
      );
      return HttpResponse.json({
        access_token: `token-${requests.length}`,
        expires_in: expiresIn,
        token_type: "Bearer",
      });
    })
  );
  return requests;
};

/** Stubs the messages.send endpoint, returning the requests it received. */
const mockSend = (status = 200) => {
  const requests: { headers: Headers; body: string }[] = [];
  server.use(
    http.post(sendEndpoint, async ({ request }) => {
      requests.push({
        headers: request.headers,
        body: await request.text(),
      });
      return status === 200
        ? HttpResponse.json({ id: "1", labelIds: ["SENT"] })
        : HttpResponse.json(
            { error: { code: status, message: "Precondition check failed." } },
            { status }
          );
    })
  );
  return requests;
};

const send = (provider = new GmailEmailProvider()) =>
  nodemailer.createTransport(provider).sendMail({
    from: "Outline <outline@example.com>",
    to: "user@example.com",
    subject: "Welcome to Outline",
    text: "Hello there",
    html: "<p>Hello there</p>",
  });

describe("GmailEmailProvider", () => {
  const original = {
    GOOGLE_MAIL_CLIENT_EMAIL: env.GOOGLE_MAIL_CLIENT_EMAIL,
    GOOGLE_MAIL_PRIVATE_KEY: env.GOOGLE_MAIL_PRIVATE_KEY,
    GOOGLE_MAIL_FROM_USER_ID: env.GOOGLE_MAIL_FROM_USER_ID,
    SMTP_FROM_EMAIL: env.SMTP_FROM_EMAIL,
  };

  beforeEach(() => {
    env.GOOGLE_MAIL_CLIENT_EMAIL = "outline@project.iam.gserviceaccount.com";
    env.GOOGLE_MAIL_PRIVATE_KEY = privateKey;
    env.GOOGLE_MAIL_FROM_USER_ID = undefined;
    env.SMTP_FROM_EMAIL = "Outline <outline@example.com>";
  });

  afterEach(() => {
    Object.assign(env, original);
  });

  it("should post the message web-safe base64 encoded", async () => {
    mockToken();
    const sends = mockSend();

    await send();

    expect(sends.length).toBe(1);
    expect(sends[0].headers.get("authorization")).toBe("Bearer token-1");

    const { raw } = JSON.parse(sends[0].body);
    // Standard base64 would risk + and / being mangled in a JSON string.
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);

    const mime = Buffer.from(raw, "base64url").toString("utf-8");
    expect(mime).toContain("Subject: Welcome to Outline");
    expect(mime).toContain("From: Outline <outline@example.com>");
    expect(mime).toContain("<p>Hello there</p>");
  });

  it("should authenticate with a signed assertion impersonating the sender", async () => {
    const tokens = mockToken();
    mockSend();

    await send();

    expect(tokens.length).toBe(1);
    expect(tokens[0].grant_type).toBe(
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    );

    // The assertion must verify against the service account's key, and name the
    // mailbox being sent on behalf of.
    const claims = JWT.verify(tokens[0].assertion, publicKey, {
      audience: tokenEndpoint,
    });
    expect(claims).toMatchObject({
      iss: "outline@project.iam.gserviceaccount.com",
      sub: "outline@example.com",
      scope: "https://www.googleapis.com/auth/gmail.send",
      aud: tokenEndpoint,
    });
  });

  it("should impersonate the configured mailbox when one is set", async () => {
    env.GOOGLE_MAIL_FROM_USER_ID = "no-reply@example.com";
    const tokens = mockToken();
    mockSend();

    await send();

    expect(
      JWT.verify(tokens[0].assertion, publicKey, { audience: tokenEndpoint })
    ).toMatchObject({ sub: "no-reply@example.com" });
  });

  it("should accept a base64 encoded private key", async () => {
    env.GOOGLE_MAIL_PRIVATE_KEY = Buffer.from(privateKey).toString("base64");
    const tokens = mockToken();
    mockSend();

    await send();

    expect(() =>
      JWT.verify(tokens[0].assertion, publicKey, { audience: tokenEndpoint })
    ).not.toThrow();
  });

  it("should reuse a cached token across sends", async () => {
    const tokens = mockToken();
    const sends = mockSend();
    const provider = new GmailEmailProvider();

    await send(provider);
    await send(provider);

    expect(tokens.length).toBe(1);
    expect(sends.length).toBe(2);
  });

  it("should throw including the response body when Gmail rejects the message", async () => {
    mockToken();
    mockSend(400);

    await expect(send()).rejects.toThrow(
      /Gmail could not send the message \(400\).*Precondition check failed/s
    );
  });

  it("should warn once when the impersonated mailbox differs from the sender", async () => {
    env.GOOGLE_MAIL_FROM_USER_ID = "svc-mailer@example.com";
    mockToken();
    mockSend();
    const warn = vi.spyOn(Logger, "warn").mockImplementation(() => undefined);
    const provider = new GmailEmailProvider();

    await send(provider);
    await send(provider);

    const warnings = warn.mock.calls.filter(([message]) =>
      String(message).includes("send-as alias")
    );
    expect(warnings.length).toBe(1);
    warn.mockRestore();
  });

  it("should throw when the service account is not configured", async () => {
    env.GOOGLE_MAIL_PRIVATE_KEY = undefined;

    await expect(send()).rejects.toThrow(
      /GOOGLE_MAIL_CLIENT_EMAIL and GOOGLE_MAIL_PRIVATE_KEY are required/
    );
    // The message must name the Workspace requirement, since this cannot work
    // with a personal Gmail account however it is configured.
    await expect(send()).rejects.toThrow(
      /Google Workspace service account with domain-wide delegation/
    );
  });
});
