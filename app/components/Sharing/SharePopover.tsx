import { AnimatePresence, m } from "framer-motion";
import { observer } from "mobx-react";
import {
  BackIcon,
  LinkIcon,
  MoreIcon,
  QuestionMarkIcon,
  UserIcon,
} from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Share from "~/models/Share";
import User from "~/models/User";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import useThrottledCallback from "~/hooks/useThrottledCallback";
import { hover } from "~/styles";
import { documentPath, urlify } from "~/utils/routeHelpers";
import Avatar from "../Avatar";
import { AvatarSize } from "../Avatar/Avatar";
import ButtonSmall from "../ButtonSmall";
import Empty from "../Empty";
import CollectionIcon from "../Icons/CollectionIcon";
import Input, { NativeInput } from "../Input";
import NudeButton from "../NudeButton";
import Squircle from "../Squircle";
import Tooltip from "../Tooltip";
import DocumentMembersList from "./DocumentMemberList";
import { InviteIcon, StyledListItem } from "./MemberListItem";
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

const presence = {
  initial: {
    opacity: 0,
    width: 0,
    marginRight: 0,
  },
  animate: {
    opacity: 1,
    width: "auto",
    marginRight: 8,
    transition: {
      type: "spring",
      duration: 0.2,
      bounce: 0,
    },
  },
  exit: {
    opacity: 0,
    width: 0,
    marginRight: 0,
  },
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
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const can = usePolicy(document);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { userMemberships } = useStores();
  const isMobile = useMobile();
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const linkButtonRef = React.useRef<HTMLButtonElement>(null);
  const [invitedInSession, setInvitedInSession] = React.useState<string[]>([]);
  const collectionSharingDisabled = document.collection?.sharing === false;

  useKeyDown(
    "Escape",
    (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();

      if (picker) {
        hidePicker();
      } else {
        onRequestClose();
      }
    },
    {
      allowInInput: true,
    }
  );

  // Fetch sharefocus the link button when the popover is opened
  React.useEffect(() => {
    if (visible) {
      void document.share();
    }
  }, [document, hidePicker, visible]);

  // Hide the picker when the popover is closed
  React.useEffect(() => {
    if (visible) {
      hidePicker();
    }
  }, [hidePicker, visible]);

  // Clear the query when picker is closed
  React.useEffect(() => {
    if (!picker) {
      setQuery("");
    }
  }, [picker]);

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

  const handleInvite = React.useCallback(
    async (user: User) => {
      setInvitedInSession((prev) => [...prev, user.id]);
      await userMemberships.create({
        documentId: document.id,
        userId: user.id,
      });
      toast.message(
        t("{{ userName }} was invited to the document", { userName: user.name })
      );
    },
    [t, userMemberships, document.id]
  );

  const handleQuery = React.useCallback(
    (event) => {
      showPicker();
      setQuery(event.target.value);
    },
    [showPicker, setQuery]
  );

  const focusInput = React.useCallback(() => {
    if (!picker) {
      inputRef.current?.focus();
      showPicker();
    }
  }, [picker, showPicker]);

  const backButton = (
    <>
      {picker && (
        <NudeButton key="back" as={m.button} {...presence} onClick={hidePicker}>
          <BackIcon />
        </NudeButton>
      )}
    </>
  );

  const doneButton = picker ? (
    invitedInSession.length ? (
      <ButtonSmall onClick={hidePicker} key="done" neutral>
        {t("Done")}
      </ButtonSmall>
    ) : null
  ) : (
    <Tooltip
      tooltip={t("Copy link")}
      delay={500}
      placement="top"
      key="copy-link"
    >
      <CopyToClipboard
        text={urlify(documentPath(document))}
        onCopy={handleCopied}
      >
        <NudeButton type="button" disabled={!share} ref={linkButtonRef}>
          <LinkIcon size={20} />
        </NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );

  return (
    <Wrapper>
      {can.manageUsers &&
        (isMobile ? (
          <Flex align="center" style={{ marginBottom: 12 }} auto>
            {backButton}
            <Input
              key="input"
              placeholder={`${t("Invite by name")}…`}
              value={query}
              onChange={handleQuery}
              onClick={showPicker}
              autoFocus
              margin={0}
              flex
            >
              {doneButton}
            </Input>
          </Flex>
        ) : (
          <HeaderInput align="center" onClick={focusInput}>
            <AnimatePresence initial={false}>
              {backButton}
              <NativeInput
                key="input"
                ref={inputRef}
                placeholder={`${t("Invite by name")}…`}
                value={query}
                onChange={handleQuery}
                onClick={showPicker}
                style={{ padding: "6px 0" }}
              />
              {doneButton}
            </AnimatePresence>
          </HeaderInput>
        ))}

      {picker && (
        <div>
          <Picker document={document} query={query} onInvite={handleInvite} />
        </div>
      )}

      <div style={{ display: picker ? "none" : "block" }}>
        <DocumentOtherAccessList document={document}>
          <DocumentMembersList
            document={document}
            invitedInSession={invitedInSession}
          />
        </DocumentOtherAccessList>

        {team.sharing && can.share && !collectionSharingDisabled && (
          <>
            {document.members.length ? <Separator /> : null}
            <PublicAccess
              document={document}
              share={share}
              sharedParent={sharedParent}
              onRequestClose={onRequestClose}
            />
          </>
        )}
      </div>
    </Wrapper>
  );
}

const Picker = observer(
  ({
    document,
    query,
    onInvite,
  }: {
    document: Document;
    query: string;
    onInvite: (user: User) => Promise<void>;
  }) => {
    const { users } = useStores();
    const { t } = useTranslation();
    const user = useCurrentUser();

    const fetchUsersByQuery = useThrottledCallback(
      (query) => users.fetchPage({ query }),
      250
    );

    const suggestions = React.useMemo(
      () =>
        users.notInDocument(document.id, query).filter((u) => u.id !== user.id),
      [users, users.orderedData, document.id, document.members, user.id, query]
    );

    React.useEffect(() => {
      if (query) {
        void fetchUsersByQuery(query);
      }
    }, [query, fetchUsersByQuery]);

    return suggestions.length ? (
      <>
        {suggestions.map((suggestion) => (
          <StyledListItem
            key={suggestion.id}
            onClick={() => onInvite(suggestion)}
            title={suggestion.name}
            subtitle={
              suggestion.isSuspended
                ? t("Suspended")
                : suggestion.isInvited
                ? t("Invited")
                : suggestion.isViewer
                ? t("Viewer")
                : suggestion.email
                ? suggestion.email
                : t("Member")
            }
            image={
              <Avatar
                model={suggestion}
                size={AvatarSize.Medium}
                showBorder={false}
              />
            }
            actions={<InviteIcon />}
          />
        ))}
      </>
    ) : (
      <Empty style={{ marginTop: 22 }}>{t("No matches")}</Empty>
    );
  }
);

const DocumentOtherAccessList = observer(
  ({
    document,
    children,
  }: {
    document: Document;
    children: React.ReactNode;
  }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const collection = document.collection;
    const usersInCollection = useUsersInCollection(collection);
    const user = useCurrentUser();

    return (
      <>
        {collection ? (
          <>
            {collection.permission ? (
              <StyledListItem
                image={
                  <Squircle color={theme.accent} size={AvatarSize.Medium}>
                    <UserIcon color={theme.accentText} size={16} />
                  </Squircle>
                }
                title={t("All members")}
                subtitle={t("Everyone in the workspace")}
                actions={
                  <AccessTooltip>
                    {collection?.permission === CollectionPermission.ReadWrite
                      ? t("Can edit")
                      : t("Can view")}
                  </AccessTooltip>
                }
              />
            ) : usersInCollection ? (
              <StyledListItem
                image={
                  <Squircle color={collection.color} size={AvatarSize.Medium}>
                    <CollectionIcon
                      collection={collection}
                      color={theme.white}
                      size={16}
                    />
                  </Squircle>
                }
                title={collection.name}
                subtitle={t("Everyone in the collection")}
                actions={<AccessTooltip>{t("Can view")}</AccessTooltip>}
              />
            ) : (
              <StyledListItem
                image={<Avatar model={user} showBorder={false} />}
                title={user.name}
                subtitle={t("You have full access")}
                actions={<AccessTooltip>{t("Can edit")}</AccessTooltip>}
              />
            )}
            {children}
          </>
        ) : document.isDraft ? (
          <>
            <StyledListItem
              image={<Avatar model={document.createdBy} showBorder={false} />}
              title={document.createdBy.name}
              actions={
                <AccessTooltip tooltip={t("Created the document")}>
                  {t("Can edit")}
                </AccessTooltip>
              }
            />
            {children}
          </>
        ) : (
          <>
            {children}
            <StyledListItem
              image={
                <Squircle color={theme.accent} size={AvatarSize.Medium}>
                  <MoreIcon color={theme.accentText} size={16} />
                </Squircle>
              }
              title={t("Other people")}
              subtitle={t("Other workspace members may have access")}
              actions={
                <AccessTooltip
                  tooltip={t(
                    "This document may be shared with more workspace members through a parent document or collection you do not have access to"
                  )}
                />
              }
            />
          </>
        )}
      </>
    );
  }
);

const AccessTooltip = ({
  children,
  tooltip,
}: {
  children?: React.ReactNode;
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

// TODO: Temp until Button/NudeButton styles are normalized
const Wrapper = styled.div`
  ${NudeButton}:${hover},
  ${NudeButton}[aria-expanded="true"] {
    background: ${(props) => darken(0.05, props.theme.buttonNeutralBackground)};
  }
`;

const Separator = styled.div`
  border-top: 1px dashed ${s("divider")};
  margin: 12px 0;
`;

const HeaderInput = styled(Flex)`
  position: sticky;
  z-index: 1;
  top: 0;
  background: ${s("menuBackground")};
  color: ${s("textTertiary")};
  border-bottom: 1px solid ${s("inputBorder")};
  padding: 0 24px 12px;
  margin-top: 0;
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: 12px;
  cursor: text;

  &:before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -20px;
    height: 20px;
    background: ${s("menuBackground")};
  }
`;

export default observer(SharePopover);
