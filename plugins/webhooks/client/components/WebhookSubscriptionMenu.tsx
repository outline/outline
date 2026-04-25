import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type WebhookSubscription from "~/models/WebhookSubscription";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useWebhookSubscriptionMenuActions } from "../hooks/useWebhookSubscriptionMenuActions";

type Props = {
  /** The webhook subscription to associate with the menu */
  webhook: WebhookSubscription;
};

function WebhookSubscriptionMenu({ webhook }: Props) {
  const { t } = useTranslation();
  const rootAction = useWebhookSubscriptionMenuActions(webhook);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Webhook")}>
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(WebhookSubscriptionMenu);
