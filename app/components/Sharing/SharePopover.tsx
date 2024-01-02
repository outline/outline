import { observer } from "mobx-react";
import { QuestionMarkIcon, TeamIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
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

function SharePopover({
  document,
  share,
  sharedParent,
  onRequestClose,
  visible,
}: Props) {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const collection = document.collection;

  useKeyDown("Escape", onRequestClose);

  React.useEffect(() => {
    if (visible) {
      void document.share();
      buttonRef.current?.focus();
    }
  }, [document, visible]);

  return (
    <>
      <Heading>{t("People with access")}</Heading>
      <DocumentMembersList document={document}>
        {collection?.permission ? (
          <Item
            image={<TeamIcon />}
            title={t("All workspace members")}
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
        ) : collection && !document.isDraft ? (
          <Item
            image={<CollectionIcon collection={collection} />}
            title={t("Collection members")}
            actions={<CollectionAccess>{t("Can view")}</CollectionAccess>}
            border={false}
            small
          />
        ) : null}
      </DocumentMembersList>

      {team.sharing && visible && (
        <>
          <Separator />
          <Heading>{t("Public access")}</Heading>

          <PublicAccess
            document={document}
            share={share}
            sharedParent={sharedParent}
            copyButtonRef={buttonRef}
            onCopied={onRequestClose}
          />
        </>
      )}
    </>
  );
}

const CollectionAccess = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();

  return (
    <Tooltip tooltip={t("Access inherited from collection")}>
      <span>
        <Text type="secondary" size="small" as={Flex} align="center" gap={2}>
          {children} <QuestionMarkIcon size={18} />
        </Text>
      </span>
    </Tooltip>
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
