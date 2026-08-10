import { useTranslation } from "react-i18next";
import { AppPage } from "~/components/AppPage";
import { useFields } from "~/hooks/useFields";
import { useSubmit } from "~/hooks/useSubmit";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import { InputSelect } from "~/components/InputSelect";
import ListItem from "~/components/List/Item";
import { StatusChip } from "~/components/StatusChip";
import Subheading from "~/components/Subheading";
import Text from "~/components/Text";
import { useShop } from "~/stores/shop";
import { formatDate } from "~/utils/format";

/**
 * WhatsApp templates and what has been sent from them.
 *
 * Only approved templates can be sent, which is the rule the provider applies
 * – the mock refuses the rest rather than pretending they went out.
 *
 * @returns the rendered WhatsApp page.
 */
function Whatsapp() {
  const { t } = useTranslation();
  const templates = useShop((state) => state.whatsappTemplates);
  const messages = useShop((state) => state.whatsappMessages);
  const customers = useShop((state) => state.customers);
  const sendWhatsapp = useShop((state) => state.sendWhatsapp);

  const fields = useFields({ templateId: "", customerId: "" });
  const templateId = fields.get("templateId");
  const customerId = fields.get("customerId");
  const submission = useSubmit();

  const selectedTemplate = templateId || templates[0]?.id || "";
  const selectedCustomer = customerId || customers[0]?.id || "";

  const handleSend = () =>
    submission.run(async () => {
      const sent = await sendWhatsapp(selectedTemplate, selectedCustomer);
      const name =
        templates.find((item) => item.id === selectedTemplate)?.name ?? "";
      return sent
        ? t("Sent “{{name}}”.", { name })
        : t("“{{name}}” is not approved yet, so nothing was sent.", { name });
    });

  const approved = templates.filter(
    (template) => template.status === "approved"
  ).length;

  return (
    <AppPage
      title={t("WhatsApp")}
      description={t("Message templates and what has gone out.")}
      actions={
        <Text type="tertiary" size="small">
          {approved} / {templates.length} {t("approved")}
        </Text>
      }
    >
      {submission.notice ? (
        <Text as="p" type="secondary" data-testid="whatsapp-notice">
          {submission.notice}
        </Text>
      ) : null}

      <Subheading>{t("Templates")}</Subheading>
      {templates.map((template) => (
        <ListItem
          key={template.id}
          title={template.name}
          subtitle={
            <>
              <span style={{ textTransform: "capitalize" }}>
                {template.category}
              </span>{" "}
              · {template.body}
            </>
          }
          actions={<StatusChip status={template.status} />}
          border
        />
      ))}
      {templates.length === 0 ? <Empty>{t("No templates.")}</Empty> : null}

      <Subheading>{t("Send")}</Subheading>
      <Flex align="flex-end" gap={8} style={{ padding: "8px 0 16px" }}>
        <InputSelect
          label={t("Template")}
          value={selectedTemplate}
          onChange={(value) => fields.set("templateId", value)}
          options={templates.map((template) => ({
            type: "item",
            label: template.name,
            value: template.id,
          }))}
        />
        <InputSelect
          label={t("Customer")}
          value={selectedCustomer}
          onChange={(value) => fields.set("customerId", value)}
          options={customers.map((customer) => ({
            type: "item",
            label: customer.name,
            value: customer.id,
          }))}
        />
        <Button onClick={() => void handleSend()}>{t("Send")}</Button>
      </Flex>

      <Subheading>{t("Sent")}</Subheading>
      {messages.map((message) => (
        <ListItem
          key={message.id}
          title={message.customerName}
          subtitle={`${message.templateName} · ${message.to} · ${formatDate(
            message.sentAt
          )}`}
          actions={<StatusChip status={message.status} />}
          border
        />
      ))}
      {messages.length === 0 ? <Empty>{t("Nothing sent yet.")}</Empty> : null}
    </AppPage>
  );
}

export default Whatsapp;
