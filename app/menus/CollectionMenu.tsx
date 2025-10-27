import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CollectionDisplayPreference, SubscriptionType } from "@shared/types";
import Collection from "~/models/Collection";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { useCollectionMenuAction } from "~/hooks/useCollectionMenuAction";
import usePolicy from "~/hooks/usePolicy";
import { MenuSeparator } from "~/components/primitives/components/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Switch from "~/components/Switch";
import { s } from "@shared/styles";

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
  const can = usePolicy(collection);

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

  const handleFooterNavToggle = React.useCallback((checked: boolean) => {
    collection.setPreference(
      CollectionDisplayPreference.showFooterNavigation,
      checked
    );
  }, []);

  const toggleSwitches = React.useMemo<React.ReactNode>(() => {
    if (!can.update) {return;}

    return (
      <>
        <MenuSeparator />
        <DisplayOptions>
          <Style>
            <ToggleMenuItem
              width={26}
              height={14}
              label={t("Show footer navigation")}
              labelPosition="left"
              checked={collection.displayPreferences?.showFooterNavigation}
              onChange={handleFooterNavToggle}
            />
          </Style>
        </DisplayOptions>
      </>
    );
  }, [
    t,
    can.update,
    handleFooterNavToggle,
    collection.displayPreferences?.showFooterNavigation,
  ]);

  return (
    <ActionContextProvider value={{ activeCollectionId: collection.id }}>
      <DropdownMenu
        action={rootAction}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Collection menu")}
        append={toggleSwitches}
      >
        <OverflowMenuButton
          neutral={neutral}
          onPointerEnter={handlePointerEnter}
        />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

const ToggleMenuItem = styled(Switch)`
  * {
    font-weight: normal;
    color: ${s("textSecondary")};
  }
`;

const DisplayOptions = styled.div`
  padding: 8px 0 0;
`;

const Style = styled.div`
  padding: 12px;

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `};
`;

export default observer(CollectionMenu);
