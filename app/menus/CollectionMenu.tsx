import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { SubscriptionType } from "@shared/types";
import Collection from "~/models/Collection";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { useCollectionMenuAction } from "~/hooks/useCollectionMenuAction";

type Props = {
  collection: Collection;
  align?: "start" | "end";
  neutral?: boolean;
  onRename?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

function CollectionMenu({
  collection,
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
      collectionId: collection.id,
      event: SubscriptionType.Document,
    })
  );

  const handlePointerEnter = React.useCallback(() => {
    if (!subscriptionLoading && !subscriptionLoaded) {
      void loadSubscription();
    }
  }, [subscriptionLoading, subscriptionLoaded, loadSubscription]);

  const rootAction = useCollectionMenuAction({
    collectionId: collection.id,
    onRename,
  });

  return (
    <ActionContextProvider value={{ activeCollectionId: collection.id }}>
      <DropdownMenu
        action={rootAction}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Collection menu")}
      >
        <OverflowMenuButton
          neutral={neutral}
          onPointerEnter={handlePointerEnter}
        />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(CollectionMenu);
