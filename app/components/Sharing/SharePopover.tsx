import { isEmail } from "class-validator";
import { AnimatePresence, m } from "framer-motion";
import { observer } from "mobx-react";
import { BackIcon, LinkIcon } from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { DocumentPermission, UserRole } from "@shared/types";
import Document from "~/models/Document";
import Share from "~/models/Share";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import { createAction } from "~/actions";
import { UserSection } from "~/actions/sections";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { hover } from "~/styles";
import { documentPath, urlify } from "~/utils/routeHelpers";
import ButtonSmall from "../ButtonSmall";
import Input, { NativeInput } from "../Input";
import NudeButton from "../NudeButton";
import Tooltip from "../Tooltip";
import DocumentMembersList from "./DocumentMemberList";
import { OtherAccess } from "./OtherAccess";
import PublicAccess from "./PublicAccess";
import { UserSuggestions } from "./UserSuggestions";

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
  const { users, userMemberships } = useStores();
  const isMobile = useMobile();
  const [query, setQuery] = React.useState("");
  const [picker, showPicker, hidePicker] = useBoolean();
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const linkButtonRef = React.useRef<HTMLButtonElement>(null);
  const [invitedInSession, setInvitedInSession] = React.useState<string[]>([]);
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);
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
      setPendingIds([]);
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

  const context = useActionContext();

  const inviteAction = React.useMemo(
    () =>
      createAction({
        name: t("Invite"),
        section: UserSection,
        perform: async () => {
          const usersInvited = await Promise.all(
            pendingIds.map(async (idOrEmail) => {
              let user;

              // convert email to user
              if (isEmail(idOrEmail)) {
                const response = await users.invite([
                  {
                    email: idOrEmail,
                    name: idOrEmail,
                    role: team.defaultUserRole,
                  },
                ]);
                user = response.users[0];
              } else {
                user = users.get(idOrEmail);
              }

              if (!user) {
                return;
              }

              await userMemberships.create({
                documentId: document.id,
                userId: user.id,
                permission:
                  user?.role === UserRole.Viewer ||
                  user?.role === UserRole.Guest
                    ? DocumentPermission.Read
                    : DocumentPermission.ReadWrite,
              });

              return user;
            })
          );

          if (usersInvited.length === 1) {
            toast.message(
              t("{{ userName }} was invited to the document", {
                userName: usersInvited[0].name,
              })
            );
          } else {
            toast.message(
              t("{{ count }} people invited to the document", {
                count: pendingIds.length,
              })
            );
          }

          setInvitedInSession((prev) => [...prev, ...pendingIds]);
          setPendingIds([]);
          hidePicker();
        },
      }),
    [
      t,
      pendingIds,
      hidePicker,
      userMemberships,
      document.id,
      users,
      team.defaultUserRole,
    ]
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

  const handleAddPendingId = React.useCallback(
    (id: string) => {
      setPendingIds((prev) => [...prev, id]);
    },
    [setPendingIds]
  );

  const handleRemovePendingId = React.useCallback(
    (id: string) => {
      setPendingIds((prev) => prev.filter((i) => i !== id));
    },
    [setPendingIds]
  );

  const backButton = (
    <>
      {picker && (
        <NudeButton key="back" as={m.button} {...presence} onClick={hidePicker}>
          <BackIcon />
        </NudeButton>
      )}
    </>
  );

  const rightButton = picker ? (
    pendingIds.length ? (
      <ButtonSmall action={inviteAction} context={context} key="invite">
        {t("Invite")}
      </ButtonSmall>
    ) : null
  ) : (
    <Tooltip
      content={t("Copy link")}
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
              placeholder={`${t("Invite")}…`}
              value={query}
              onChange={handleQuery}
              onClick={showPicker}
              autoFocus
              margin={0}
              flex
            >
              {rightButton}
            </Input>
          </Flex>
        ) : (
          <HeaderInput align="center" onClick={focusInput}>
            <AnimatePresence initial={false}>
              {backButton}
              <NativeInput
                key="input"
                ref={inputRef}
                placeholder={`${t("Invite")}…`}
                value={query}
                onChange={handleQuery}
                onClick={showPicker}
                style={{ padding: "6px 0" }}
              />
              {rightButton}
            </AnimatePresence>
          </HeaderInput>
        ))}

      {picker && (
        <div>
          <UserSuggestions
            document={document}
            query={query}
            pendingIds={pendingIds}
            addPendingId={handleAddPendingId}
            removePendingId={handleRemovePendingId}
          />
        </div>
      )}

      <div style={{ display: picker ? "none" : "block" }}>
        <OtherAccess document={document}>
          <DocumentMembersList
            document={document}
            invitedInSession={invitedInSession}
          />
        </OtherAccess>

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
