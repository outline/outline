import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionType } from "@shared/types";
import type Notebook from "~/models/Notebook";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { useNotebookMenuAction } from "~/hooks/useNotebookMenuAction";
type Props = {
  notebook: Notebook;
  align?: "start" | "end";
  neutral?: boolean;
  onRename?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};
function NotebookMenu({
  notebook,
  align,
  neutral,
  onRename,
  onOpen,
  onClose,
}: Props) {
  const { subscriptions } = useStores();
  const { t } = useTranslation();
  const {
    loading: subscriptionLoading,
    loaded: subscriptionLoaded,
    request: loadSubscription,
  } = useRequest(() =>
    subscriptions.fetchOne({
      notebookId: notebook.id,
      event: SubscriptionType.Note,
    })
  );
  const handlePointerEnter = React.useCallback(() => {
    if (!subscriptionLoading && !subscriptionLoaded) {
      void loadSubscription();
    }
  }, [subscriptionLoading, subscriptionLoaded, loadSubscription]);
  const rootAction = useNotebookMenuAction({
    notebookId: notebook.id,
    onRename,
  });
  return (
    <ActionContextProvider value={{ activeModels: [notebook] }}>
      <DropdownMenu
        action={rootAction}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Notebook options")}
      >
        <OverflowMenuButton
          neutral={neutral}
          onPointerEnter={handlePointerEnter}
        />
      </DropdownMenu>
    </ActionContextProvider>
  );
}
export default observer(NotebookMenu);
