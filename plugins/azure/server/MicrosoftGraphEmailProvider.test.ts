import { http, HttpResponse } from "msw";
import nodemailer from "nodemailer";
import { server } from "@server/test/msw";
import env from "./env";
import { MicrosoftGraphEmailProvider } from "./MicrosoftGraphEmailProvider";

const tokenEndpoint =
  "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token";
const sendEndpoint = "https://graph.microsoft.com/v1.0/users/:mailbox/sendMail";

/** Stubs the token endpoint, returning the requests it received. */
const mockToken = (expiresIn: number | undefined = 3599) => {
  const requests: Record<string, string>[] = [];
  server.use(
    http.post(tokenEndpoint, async ({ request }) => {
      requests.push(
        Object.fromEntries(new URLSearchParams(await request.text()))
      );
      return HttpResponse.json({
        access_token: `token-${requests.length}`,
        ...(expiresIn === undefined ? {} : { expires_in: expiresIn }),
        token_type: "Bearer",
      });
    })
  );
  return requests;
};

/** Stubs the sendMail endpoint, returning the requests it received. */
const mockSend = (status = 202) => {
  const requests: { url: string; headers: Headers; body: string }[] = [];
  server.use(
    http.post(sendEndpoint, async ({ request }) => {
      requests.push({
        url: request.url,
        headers: request.headers,
        body: await request.text(),
      });
      return status === 202
        ? new HttpResponse(null, { status: 202 })
        : HttpResponse.json(
            { error: { code: "ErrorAccessDenied", message: "Access denied" } },
            { status }
          );
    })
  );
  return requests;
};

const send = (provider = new MicrosoftGraphEmailProvider()) =>
  nodemailer.createTransport(provider).sendMail({
    from: "Outline <outline@example.com>",
    to: "user@example.com",
    subject: "Welcome to Outline",
    text: "Hello there",
    html: "<p>Hello there</p>",
  });

describe("MicrosoftGraphEmailProvider", () => {
  const original = {
    AZURE_MAIL_CLIENT_ID: env.AZURE_MAIL_CLIENT_ID,
    AZURE_MAIL_CLIENT_SECRET: env.AZURE_MAIL_CLIENT_SECRET,
    AZURE_MAIL_TENANT_ID: env.AZURE_MAIL_TENANT_ID,
    AZURE_MAIL_FROM_USER_ID: env.AZURE_MAIL_FROM_USER_ID,
    SMTP_FROM_EMAIL: env.SMTP_FROM_EMAIL,
  };

  beforeEach(() => {
    env.AZURE_MAIL_CLIENT_ID = "client-id";
    env.AZURE_MAIL_CLIENT_SECRET = "client-secret";
    env.AZURE_MAIL_TENANT_ID = "tenant-id";
    env.AZURE_MAIL_FROM_USER_ID = undefined;
    env.SMTP_FROM_EMAIL = "Outline <outline@example.com>";
  });

  afterEach(() => {
    Object.assign(env, original);
  });

  it("should post the message to Graph as base64 encoded MIME", async () => {
    mockToken();
    const sends = mockSend();

    await send();

    expect(sends.length).toBe(1);
    expect(sends[0].url).toBe(
      "https://graph.microsoft.com/v1.0/users/outline%40example.com/sendMail"
    );
    expect(sends[0].headers.get("content-type")).toBe("text/plain");
    expect(sends[0].headers.get("authorization")).toBe("Bearer token-1");

    // The body must be base64, and decode to the assembled message.
    expect(sends[0].body).toMatch(/^[A-Za-z0-9+/=\r\n]+$/);
    const mime = Buffer.from(sends[0].body, "base64").toString("utf-8");
    expect(mime).toContain("Subject: Welcome to Outline");
    expect(mime).toContain("From: Outline <outline@example.com>");
    expect(mime).toContain("To: user@example.com");
    expect(mime).toContain("<p>Hello there</p>");
  });

  it("should request a token using the client credentials flow", async () => {
    const tokens = mockToken();
    mockSend();

    await send();

    expect(tokens.length).toBe(1);
    expect(tokens[0]).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      grant_type: "client_credentials",
      scope: "https://graph.microsoft.com/.default",
    });
  });

  it("should reuse a cached token across sends", async () => {
    const tokens = mockToken();
    const sends = mockSend();
    const provider = new MicrosoftGraphEmailProvider();

    await send(provider);
    await send(provider);

    expect(tokens.length).toBe(1);
    expect(sends.length).toBe(2);
    expect(sends[1].headers.get("authorization")).toBe("Bearer token-1");
  });

  it("should request a new token once the cached one has expired", async () => {
    // Tokens are treated as expiring a minute early, so this is already stale.
    const tokens = mockToken(30);
    const sends = mockSend();
    const provider = new MicrosoftGraphEmailProvider();

    await send(provider);
    await send(provider);

    expect(tokens.length).toBe(2);
    expect(sends[1].headers.get("authorization")).toBe("Bearer token-2");
  });

  it("should retain the Bcc header for Graph to resolve recipients", async () => {
    mockToken();
    const sends = mockSend();

    await nodemailer
      .createTransport(new MicrosoftGraphEmailProvider())
      .sendMail({
        from: "Outline <outline@example.com>",
        to: "user@example.com",
        bcc: "hidden@example.com",
        subject: "Welcome to Outline",
        text: "Hello there",
      });

    const mime = Buffer.from(sends[0].body, "base64").toString("utf-8");
    expect(mime).toContain("Bcc: hidden@example.com");
  });

  it("should still cache tokens when the response omits expires_in", async () => {
    const tokens = mockToken(undefined);
    const sends = mockSend();
    const provider = new MicrosoftGraphEmailProvider();

    await send(provider);
    await send(provider);

    expect(tokens.length).toBe(1);
    expect(sends.length).toBe(2);
  });

  it("should resolve the mailbox from configuration, not the message", async () => {
    // The message's own from address can vary per message, so the sending
    // mailbox must come from configuration.
    env.SMTP_FROM_EMAIL = "Outline <fixed@example.com>";
    mockToken();
    const sends = mockSend();

    await send();

    expect(sends[0].url).toBe(
      "https://graph.microsoft.com/v1.0/users/fixed%40example.com/sendMail"
    );
  });

  it("should send from the configured mailbox when one is set", async () => {
    env.AZURE_MAIL_FROM_USER_ID = "shared-mailbox@example.com";
    mockToken();
    const sends = mockSend();

    await send();

    expect(sends[0].url).toBe(
      "https://graph.microsoft.com/v1.0/users/shared-mailbox%40example.com/sendMail"
    );
  });

  it("should throw including the response body when Graph rejects the message", async () => {
    mockToken();
    mockSend(403);

    await expect(send()).rejects.toThrow(
      /Microsoft Graph could not send the message \(403\).*ErrorAccessDenied/s
    );
  });

  it("should not cache a failed token request", async () => {
    let attempts = 0;
    server.use(
      http.post(tokenEndpoint, () => {
        attempts++;
        return HttpResponse.json({ error: "invalid_client" }, { status: 401 });
      })
    );
    const provider = new MicrosoftGraphEmailProvider();

    await expect(send(provider)).rejects.toThrow(
      /Microsoft Graph rejected the credentials.*invalid_client/s
    );
    await expect(send(provider)).rejects.toThrow(/invalid_client/);
    expect(attempts).toBe(2);
  });
});
