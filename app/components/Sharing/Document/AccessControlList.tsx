import { observer } from "mobx-react";
import { PadlockIcon, MoreIcon, QuestionMarkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { Pagination } from "@shared/constants";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import type Document from "~/models/Document";
import type Share from "~/models/Share";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import TeamLogo from "~/components/TeamLogo";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMaxHeight from "~/hooks/useMaxHeight";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { Avatar, AvatarSize } from "../../Avatar";
import Tooltip from "../../Tooltip";
import { SectionHeading, Separator, SmallInputSelect } from "../components";
import { ListItem } from "../components/ListItem";
import { Placeholder } from "../components/Placeholder";
import DocumentMemberList from "./DocumentMemberList";
import PublicAccess from "./PublicAccess";

type Props = {
  /** The document being shared. */
  document: Document;
  /** List of users that have been invited during the current editing session */
  invitedInSession: string[];
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
  visible: boolean;
};

export const AccessControlList = observer(
  ({
    document,
    invitedInSession,
    share,
    sharedParent,
    onRequestClose,
    visible,
  }: Props) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const collection = document.collection;
    const { documents, userMemberships, groupMemberships } = useStores();
    const collectionSharingDisabled = document.collection?.sharing === false;
    const team = useCurrentTeam();
    const can = usePolicy(document);
    const canCollection = usePolicy(collection);
    const documentId = document.id;

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessRef = React.useRef<HTMLDivElement | null>(null);
    const publicAccessHeight = publicAccessRef.current?.clientHeight || 0;
    const { maxHeight, calcMaxHeight } = useMaxHeight({
      elementRef: containerRef,
      maxViewportPercentage: 45,
      margin: 24,
    });

    const parentDocument = document.parentDocumentId
      ? documents.get(document.parentDocumentId)
      : undefined;
    const parentIsPrivate = parentDocument?.isPrivate ?? false;

    const handleAccessChange = React.useCallback(
      async (value: string) => {
        await document.save({ isPrivate: value === "private" });
      },
      [document]
    );

    const accessOptions: Option[] = React.useMemo(
      () => [
        {
          type: "item" as const,
          label: t("Restricted"),
          value: "private",
        },
        {
          type: "item" as const,
          label: collection.isPrivate
            ? t("Collection members")
            : t("Everyone in workspace"),
          value: "inherited",
        },
      ],
      [t]
    );

    const { loading: userMembershipLoading, request: fetchUserMemberships } =
      useRequest(
        React.useCallback(
          () =>
            userMemberships.fetchDocumentMemberships({
              id: documentId,
              limit: Pagination.defaultLimit,
            }),
          [userMemberships, documentId]
        )
      );

    const { loading: groupMembershipLoading, request: fetchGroupMemberships } =
      useRequest(
        React.useCallback(
          () => groupMemberships.fetchAll({ documentId }),
          [groupMemberships, documentId]
        )
      );

    const hasMemberships =
      groupMemberships.inDocument(documentId)?.length > 0 ||
      document.members.length > 0;
    const showLoading =
      !hasMemberships && (groupMembershipLoading || userMembershipLoading);

    React.useEffect(() => {
      void fetchUserMemberships();
      void fetchGroupMemberships();
    }, [fetchUserMemberships, fetchGroupMemberships]);

    React.useEffect(() => {
      calcMaxHeight();
    });

    return (
      <Wrapper>
        <ScrollableContainer
          ref={containerRef}
          hiddenScrollbars
          style={{
            maxHeight: maxHeight ? maxHeight - publicAccessHeight : undefined,
          }}
        >
          {!document.isDraft && can.restrict && (
            <>
              <SectionHeading>General access</SectionHeading>
              <ListItem
                image={
                  document.isPrivate || collection.isPrivate ? (
                    <Squircle
                      color={theme.textTertiary}
                      size={AvatarSize.Medium}
                    >
                      <PadlockIcon color={theme.white} size={16} />
                    </Squircle>
                  ) : (
                    <TeamLogo model={team} size={AvatarSize.Medium} />
                  )
                }
                title={
                  <SmallInputSelect
                    options={accessOptions}
                    value={document.isPrivate ? "private" : "inherited"}
                    onChange={handleAccessChange}
                    label={t("Access")}
                    hideLabel
                    short
                    disabled={!can.restrict || parentIsPrivate}
                    nude
                  />
                }
                subtitle={
                  document.isPrivate ? (
                    t("Only invited users can access")
                  ) : parentIsPrivate ? (
                    <Trans>
                      Required by{" "}
                      <StyledLink to={parentDoxcument?.path ?? ""}>
                        parent
                      </StyledLink>
                    </Trans>
                  ) : collection.isPrivate ? (
                    t("Members of {{ itemName }} can access", {
                      itemName: collection.name,
                    })
                  ) : (
                    t("All members of {{ itemName }}", {
                      itemName: team.name,
                    })
                  )
                }
                actions={
                  document.isPrivate || collection.isPrivate ? null : (
                    <AccessTooltip content={t("Inherited from collection")}>
                      {collection.permission === CollectionPermission.Read
                        ? t("View only")
                        : t("Can edit")}
                    </AccessTooltip>
                  )
                }
              />
            </>
          )}
          {document.isDraft ? (
            <>
              <SectionHeading>People with access</SectionHeading>
              <ListItem
                image={<Avatar model={document.createdBy} />}
                title={document.createdBy?.name}
                actions={
                  <AccessTooltip content={t("Created the document")}>
                    {t("Can edit")}
                  </AccessTooltip>
                }
              />
              {showLoading ? (
                <Placeholder />
              ) : (
                <DocumentMemberList
                  document={document}
                  invitedInSession={invitedInSession}
                />
              )}
            </>
          ) : collection && canCollection.readDocument ? (
            <>
              <SectionHeading>People with access</SectionHeading>{" "}
              {showLoading ? (
                <Placeholder />
              ) : (
                <DocumentMemberList
                  document={document}
                  invitedInSession={invitedInSession}
                />
              )}
            </>
          ) : (
            <>
              {showLoading ? (
                <Placeholder />
              ) : (
                <DocumentMemberList
                  document={document}
                  invitedInSession={invitedInSession}
                />
              )}
              <ListItem
                image={
                  <Squircle color={theme.accent} size={AvatarSize.Medium}>
                    <MoreIcon color={theme.accentText} size={16} />
                  </Squircle>
                }
                title={t("Other people")}
                subtitle={t("Other workspace members may have access")}
                actions={
                  <AccessTooltip
                    content={t(
                      "This document may be shared with more workspace members through a parent document or collection you do not have access to"
                    )}
                  />
                }
              />
            </>
          )}
        </ScrollableContainer>
        {team.sharing && can.share && !collectionSharingDisabled && visible && (
          <Sticky>
            {document.members.length ? <Separator /> : null}
            <PublicAccess
              ref={publicAccessRef}
              document={document}
              share={share}
              sharedParent={sharedParent}
              onRequestClose={onRequestClose}
            />
          </Sticky>
        )}
      </Wrapper>
    );
  }
);

const AccessTooltip = ({
  children,
  content,
}: {
  children?: React.ReactNode;
  content?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Flex align="center" gap={2}>
      <Text type="secondary" size="small">
        {children}
      </Text>
      <Tooltip content={content ?? t("Access inherited from collection")}>
        <NudeButton size={18}>
          <QuestionMarkIcon size={18} />
        </NudeButton>
      </Tooltip>
    </Flex>
  );
};

const Wrapper = styled(Flex)`
  flex-direction: column;
`;

const Sticky = styled.div`
  background: ${s("menuBackground")};
  position: sticky;
  bottom: 0;
`;

const StyledLink = styled(Link)`
  color: ${s("textTertiary")};
  text-decoration: underline;
`;

const ScrollableContainer = styled(Scrollable)`
  padding: 12px 24px;
  margin: -12px -24px;
`;
