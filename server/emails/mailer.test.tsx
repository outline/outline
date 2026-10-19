import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import mailer from "./mailer";

describe("Mailer", () => {
  let transporter: Transporter | undefined;

  beforeEach(() => {
    transporter = mailer.transporter;
    mailer.transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
  });

  afterEach(() => {
    mailer.transporter = transporter;
    vi.restoreAllMocks();
  });

  const send = async (unsubscribeUrl?: string) => {
    const spy = vi.spyOn(mailer.transporter!, "sendMail");
    await mailer.sendMail({
      to: "user@example.com",
      from: { name: "Outline", address: "hello@example.com" },
      subject: "Subject",
      text: "Text",
      component: <p>Hello</p>,
      unsubscribeUrl,
    });
    const info = await spy.mock.results[0].value;
    return (info.message as Buffer).toString();
  };

  it("should add one-click unsubscribe headers", async () => {
    const message = await send("https://example.com/unsubscribe?token=abc");

    expect(message).toContain(
      "List-Unsubscribe: <https://example.com/unsubscribe?token=abc>"
    );
    expect(message).toContain(
      "List-Unsubscribe-Post: List-Unsubscribe=One-Click"
    );
  });

  it("should not add unsubscribe headers without a URL", async () => {
    const message = await send();

    expect(message).not.toContain("List-Unsubscribe");
  });
});
