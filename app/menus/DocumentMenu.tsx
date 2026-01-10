import noop from "lodash/noop";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { SubscriptionType, UserPreference } from "@shared/types";
import type Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import Switch from "~/components/Switch";
import { ActionContextProvider } from "~/hooks/useActionContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { MenuSeparator } from "~/components/primitives/components/Menu";
import { useDocumentMenuAction } from "~/hooks/useDocumentMenuAction";

type Props = {
  /** Document for which the menu is to be shown */
  document: Document;
  /** Alignment w.r.t trigger - defaults to start */
  align?: "start" | "end";
  /** Trigger's variant - renders nude variant if unset */
  neutral?: boolean;
  /** Pass true if the document is currently being displayed */
  showDisplayOptions?: boolean;
  /** Whether to include the option of toggling embeds as menu item */
  showToggleEmbeds?: boolean;
  /** Invoked when the "Find and replace" menu item is clicked */
  onFindAndReplace?: () => void;
  /** Callback when a template is selected to apply its content to the document */
  onSelectTemplate?: (template: Document) => void;
  /** Invoked when the "Rename" menu item is clicked */
  onRename?: () => void;
  /** Invoked when menu is opened */
  onOpen?: () => void;
  /** Invoked when menu is closed */
  onClose?: () => void;
};

function DocumentMenu({
  document,
  align,
  neutral,
  showToggleEmbeds,
  showDisplayOptions,
  onSelectTemplate,
  onRename,
  onOpen,
  onClose,
  onFindAndReplace,
}: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const isMobile = useMobile();
  const can = usePolicy(document);

  const { userMemberships, groupMemberships, subscriptions, pins } =
    useStores();

  const isShared = !!(
    userMemberships.getByDocumentId(document.id) ||
    groupMemberships.getByDocumentId(document.id)
  );

  const {
    loading: auxDataLoading,
    loaded: auxDataLoaded,
    request: auxDataRequest,
  } = useRequest(() =>
    Promise.all([
      subscriptions.fetchOne({
        documentId: document.id,
        event: SubscriptionType.Document,
      }),
      document.collectionId
        ? subscriptions.fetchOne({
            collectionId: document.collectionId,
            event: SubscriptionType.Document,
          })
        : noop,
      pins.fetchOne({
        documentId: document.id,
        collectionId: document.collectionId ?? null,
      }),
    ])
  );

  const handlePointerEnter = React.useCallback(() => {
    if (!auxDataLoading && !auxDataLoaded) {
      void auxDataRequest();
      void document.loadRelations();
    }
  }, [auxDataLoading, auxDataLoaded, auxDataRequest, document]);

  const handleEmbedsToggle = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        document.enableEmbeds();
      } else {
        document.disableEmbeds();
      }
    },
    [document]
  );

  const handleFullWidthToggle = React.useCallback(
    (checked: boolean) => {
      user.setPreference(UserPreference.FullWidthDocuments, checked);
      void user.save();
      document.fullWidth = checked;
      void document.save({ fullWidth: checked });
    },
    [user, document]
  );

  const handleInsightsToggle = React.useCallback(
    (checked: boolean) => {
      void document.save({ insightsEnabled: checked });
    },
    [document]
  );

  const rootAction = useDocumentMenuAction({
    documentId: document.id,
    onFindAndReplace,
    onRename,
    onSelectTemplate,
  });

  const toggleSwitches = React.useMemo<React.ReactNode>(() => {
    if (!can.update || !(showDisplayOptions || showToggleEmbeds)) {
      return;
    }

    return (
      <>
        <MenuSeparator />
        <DisplayOptions>
          {can.updateInsights && (
            <Style>
              <ToggleMenuItem
                width={26}
                height={14}
                label={t("Enable viewer insights")}
                labelPosition="left"
                checked={document.insightsEnabled}
                onChange={handleInsightsToggle}
              />
            </Style>
          )}
          {showToggleEmbeds && (
            <Style>
              <ToggleMenuItem
                width={26}
                height={14}
                label={t("Enable embeds")}
                labelPosition="left"
                checked={!document.embedsDisabled}
                onChange={handleEmbedsToggle}
              />
            </Style>
          )}
          {showDisplayOptions && !isMobile && (
            <Style>
              <ToggleMenuItem
                width={26}
                height={14}
                label={t("Full width")}
                labelPosition="left"
                checked={document.fullWidth}
                onChange={handleFullWidthToggle}
              />
            </Style>
          )}
        </DisplayOptions>
      </>
    );
  }, [
    t,
    can.update,
    can.updateInsights,
    document.embedsDisabled,
    document.fullWidth,
    document.insightsEnabled,
    isMobile,
    showDisplayOptions,
    showToggleEmbeds,
    handleEmbedsToggle,
    handleFullWidthToggle,
    handleInsightsToggle,
  ]);

  return (
    <ActionContextProvider
      value={{
        activeDocumentId: document.id,
        activeCollectionId:
          !isShared && document.collectionId
            ? document.collectionId
            : undefined,
      }}
    >
      <DropdownMenu
        action={rootAction}
        align={align}
        onOpen={onOpen}
        onClose={onClose}
        ariaLabel={t("Document options")}
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

export default observer(DocumentMenu);
