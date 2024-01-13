import { observer } from "mobx-react";
import { QuestionMarkIcon, TeamIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useKeyDown from "~/hooks/useKeyDown";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { documentPath, urlify } from "~/utils/routeHelpers";
import Avatar from "../Avatar";
import CollectionIcon from "../Icons/CollectionIcon";
import Item from "../List/Item";
import Tooltip from "../Tooltip";
import DocumentMembersList from "./DocumentMemberList";
import PublicAccess from "./PublicAccess";

type Props = {
  /** The document to share. */
  document: Document;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

function useUsersInCollection(collection?: Collection) {
  const { users, memberships } = useStores();
  const { request } = useRequest(() =>
    memberships.fetchPage({ limit: 1, id: collection!.id })
  );

  React.useEffect(() => {
    if (collection && !collection.permission) {
      void request();
    }
  }, [collection]);

  return collection
    ? collection.permission
      ? true
      : users.inCollection(collection.id).length > 1
    : false;
}

function SharePopover({
  document,
  share,
  sharedParent,
  onRequestClose,
  visible,
}: Props) {
  const user = useCurrentUser();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const collection = document.collection;

  useKeyDown("Escape", onRequestClose);

  React.useEffect(() => {
    if (visible) {
      void document.share();
      buttonRef.current?.focus();
    }
  }, [document, visible]);

  const handleCopied = React.useCallback(() => {
    onRequestClose();

    timeout.current = setTimeout(() => {
      toast.message(t("Link copied to clipboard"));
    }, 100);

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [onRequestClose, t]);

  const usersInCollection = useUsersInCollection(collection);

  return (
    <>
      <Heading>
        {t("People with access")}

        <CopyToClipboard
          text={urlify(documentPath(document))}
          onCopy={handleCopied}
        >
          <Button type="button" disabled={!share} ref={buttonRef} neutral>
            {t("Copy link")}
          </Button>
        </CopyToClipboard>
      </Heading>
      <DocumentMembersList document={document}>
        {collection ? (
          <>
            {collection.permission ? (
              <Item
                image={<TeamIcon />}
                title={t("Everyone at {{ name }}", {
                  name: team.name,
                })}
                actions={
                  <CollectionAccess>
                    {collection?.permission === CollectionPermission.ReadWrite
                      ? t("Can edit")
                      : t("Can view")}
                  </CollectionAccess>
                }
                border={false}
                small
              />
            ) : usersInCollection ? (
              <Item
                image={<CollectionIcon collection={collection} />}
                title={t("Collection members")}
                actions={<CollectionAccess>{t("Can view")}</CollectionAccess>}
                border={false}
                small
              />
            ) : (
              <Item
                image={<Avatar model={user} />}
                title={user.name}
                actions={<CollectionAccess>{t("Can edit")}</CollectionAccess>}
                border={false}
                small
              />
            )}
          </>
        ) : (
          <Item
            image={<Avatar model={document.createdBy} />}
            title={document.createdBy.name}
            actions={
              <CollectionAccess tooltip={t("Created the document")}>
                {t("Can edit")}
              </CollectionAccess>
            }
            border={false}
            small
          />
        )}
      </DocumentMembersList>

      {team.sharing && visible && (
        <>
          <Separator />
          <Heading>{t("Public access")}</Heading>

          <PublicAccess
            document={document}
            share={share}
            sharedParent={sharedParent}
            onCopied={handleCopied}
          />
        </>
      )}
    </>
  );
}

const CollectionAccess = ({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Flex align="center" gap={2}>
      <Text type="secondary" size="small" as="span">
        {children}
      </Text>
      <Tooltip tooltip={tooltip ?? t("Access inherited from collection")}>
        <QuestionMarkIcon size={18} />
      </Tooltip>
    </Flex>
  );
};

const Heading = styled(Text).attrs({ size: "large", weight: "bold" })`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const Separator = styled.div`
  height: 1px;
  margin: 16px 0;
  width: 100%;
  background-color: ${s("divider")};
`;

export default observer(SharePopover);
