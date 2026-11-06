import nodemailer from "nodemailer";
import { Mailer } from "./mailer";
import EmailLayout from "./templates/components/EmailLayout";

const headStyles =
  "#__bodyTable__{font-family:-apple-system,BlinkMacSystemFont,Inter,'Segoe UI',Roboto,Oxygen,sans-serif;font-size:16px;line-height:1.5}@media (prefers-color-scheme:dark){.email-button{background:#fff!important;color:#000!important}}";

const renderHtml = async (subject: string, lang?: string) => {
  const mailer = new Mailer();
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const spy = vi.spyOn(transporter, "sendMail");
  mailer.transporter = transporter;

  await mailer.sendMail({
    to: "user@example.com",
    from: { name: "Outline", address: "hello@example.com" },
    subject,
    lang,
    text: "Text",
    component: <EmailLayout previewText="Preview">Body</EmailLayout>,
  });

  return String(spy.mock.calls[0][0].html);
};

describe("Mailer", () => {
  it("should inject the exact head styles", async () => {
    const html = await renderHtml("Subject");

    expect(html).toContain(
      `<style type="text/css">\n          ${headStyles}\n`
    );
  });

  it("should escape the subject and language in the document", async () => {
    const html = await renderHtml("<b>A&B</b>", `en"><script>`);

    expect(html).toContain("<title>&lt;b&gt;A&amp;B&lt;/b&gt;</title>");
    expect(html).toContain('lang="en&quot;&gt;&lt;script&gt;"');
  });

  it("should remove the default spacing from layout tables", async () => {
    const html = await renderHtml("Subject");

    expect(html).toContain(
      '<table role="presentation" border="0" cellSpacing="0" cellPadding="0" bgcolor="#FFFFFF" id="__bodyTable__"'
    );
  });
});
