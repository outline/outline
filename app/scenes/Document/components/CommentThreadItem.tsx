import { differenceInMilliseconds } from "date-fns";
import { action } from "mobx";
import { observer } from "mobx-react";
import { DoneIcon } from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import { s } from "@shared/styles";
import { ProsemirrorData } from "@shared/types";
import { dateToRelative } from "@shared/utils/date";
import { Minute } from "@shared/utils/time";
import Comment from "~/models/Comment";
import { Avatar } from "~/components/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import ReactionList from "~/components/Reactions/ReactionList";
import ReactionPicker from "~/components/Reactions/ReactionPicker";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import { resolveCommentFactory } from "~/actions/definitions/comments";
import useActionContext from "~/hooks/useActionContext";
import useBoolean from "~/hooks/useBoolean";
import useCurrentUser from "~/hooks/useCurrentUser";
import CommentMenu from "~/menus/CommentMenu";
import { hover } from "~/styles";
import CommentEditor from "./CommentEditor";
import { HighlightedText } from "./HighlightText";

/**
 * Hook to calculate if we should display a timestamp on a comment
 *
 * @param createdAt The date the comment was created
 * @param previousCreatedAt The date of the previous comment, if any
 * @returns boolean if to show timestamp
 */
function useShowTime(
  createdAt: string | undefined,
  previousCreatedAt: string | undefined
): boolean {
  if (!createdAt) {
    return false;
  }

  const previousTimeStamp = previousCreatedAt
    ? dateToRelative(Date.parse(previousCreatedAt))
    : undefined;
  const currentTimeStamp = dateToRelative(Date.parse(createdAt));

  const msSincePreviousComment = previousCreatedAt
    ? differenceInMilliseconds(
        Date.parse(createdAt),
        Date.parse(previousCreatedAt)
      )
    : 0;

  return (
    !msSincePreviousComment ||
    (msSincePreviousComment > 15 * Minute.ms &&
      previousTimeStamp !== currentTimeStamp)
  );
}

type Props = {
  /** The comment to render */
  comment: Comment;
  /** The text direction of the editor */
  dir?: "rtl" | "ltr";
  /** Whether this is the first comment in the thread */
  firstOfThread?: boolean;
  /** Whether this is the last comment in the thread */
  lastOfThread?: boolean;
  /** Whether this is the first consecutive comment by this author */
  firstOfAuthor?: boolean;
  /** Whether this is the last consecutive comment by this author */
  lastOfAuthor?: boolean;
  /** The date of the previous comment in the thread */
  previousCommentCreatedAt?: string;
  /** Whether the user can reply in the thread */
  canReply: boolean;
  /** Callback when the comment has been deleted */
  onDelete?: (id: string) => void;
  /** Callback when the comment has been updated */
  onUpdate?: (id: string, attrs: { resolved: boolean }) => void;
  /** Text to highlight at the top of the comment */
  highlightedText?: string;
  /** Enable scroll for the comments container */
  enableScroll: () => void;
  /** Disable scroll for the comments container */
  disableScroll: () => void;
};

function CommentThreadItem({
  comment,
  firstOfAuthor,
  firstOfThread,
  lastOfThread,
  dir,
  previousCommentCreatedAt,
  canReply,
  onDelete,
  onUpdate,
  highlightedText,
  enableScroll,
  disableScroll,
}: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [data, setData] = React.useState(comment.data);
  const showAuthor = firstOfAuthor;
  const showTime = useShowTime(comment.createdAt, previousCommentCreatedAt);
  const showEdited =
    comment.updatedAt &&
    comment.updatedAt !== comment.createdAt &&
    !comment.isResolved;
  const [isEditing, setEditing, setReadOnly] = useBoolean();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleAddReaction = React.useCallback(
    async (emoji: string) => {
      await comment.addReaction({ emoji, user });
    },
    [comment, user]
  );

  const handleRemoveReaction = React.useCallback(
    async (emoji: string) => {
      await comment.removeReaction({ emoji, user });
    },
    [comment, user]
  );

  const handleUpdate = React.useCallback(
    (attrs: { resolved: boolean }) => {
      onUpdate?.(comment.id, attrs);
    },
    [comment.id, onUpdate]
  );

  const handleDelete = React.useCallback(() => {
    onDelete?.(comment.id);
  }, [comment.id, onDelete]);

  const handleChange = React.useCallback(
    (value: (asString: boolean) => ProsemirrorData) => {
      setData(value(false));
    },
    []
  );

  const handleSave = React.useCallback(() => {
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  }, []);

  const handleSubmit = action(async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setReadOnly();
      comment.data = data;
      await comment.save();
    } catch (error) {
      setEditing();
      toast.error(t("Error updating comment"));
    }
  });

  const handleCancel = () => {
    setData(comment.data);
    setReadOnly();
  };

  return (
    <Flex gap={8} align="flex-start" reverse={dir === "rtl"}>
      {firstOfAuthor && (
        <AvatarSpacer>
          <Avatar model={comment.createdBy} size={24} />
        </AvatarSpacer>
      )}
      <Bubble
        $firstOfThread={firstOfThread}
        $firstOfAuthor={firstOfAuthor}
        $lastOfThread={lastOfThread}
        $dir={dir}
        $canReply={canReply}
        column
      >
        {(showAuthor || showTime) && (
          <Meta size="xsmall" type="secondary" dir={dir}>
            {showAuthor && <em>{comment.createdBy.name}</em>}
            {showAuthor && showTime && <> &middot; </>}
            {showTime && (
              <Time
                dateTime={comment.createdAt}
                tooltipDelay={500}
                addSuffix
                shorten
              />
            )}
            {showEdited && (
              <>
                {" "}
                (
                <Time dateTime={comment.updatedAt} tooltipDelay={500}>
                  {t("edited")}
                </Time>
                )
              </>
            )}
          </Meta>
        )}
        {highlightedText && (
          <HighlightedText>{highlightedText}</HighlightedText>
        )}
        <Body ref={formRef} onSubmit={handleSubmit}>
          <StyledCommentEditor
            key={String(isEditing)}
            readOnly={!isEditing}
            value={comment.data}
            defaultValue={data}
            onChange={handleChange}
            onSave={handleSave}
            autoFocus
          />
          {isEditing && (
            <Flex align="flex-end" gap={8}>
              <ButtonSmall type="submit" borderOnHover>
                {t("Save")}
              </ButtonSmall>
              <ButtonSmall onClick={handleCancel} neutral borderOnHover>
                {t("Cancel")}
              </ButtonSmall>
            </Flex>
          )}
          {!!comment.reactions.length && (
            <ReactionListContainer gap={6} align="center">
              <ReactionList
                model={comment}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
                picker={
                  !comment.isResolved ? (
                    <Action
                      as={ReactionPicker}
                      onSelect={handleAddReaction}
                      onOpen={disableScroll}
                      onClose={enableScroll}
                      size={28}
                      rounded
                    />
                  ) : undefined
                }
              />
            </ReactionListContainer>
          )}
        </Body>
        <EventBoundary>
          {!isEditing && (
            <Actions gap={4} dir={dir}>
              {firstOfThread && (
                <ResolveButton onUpdate={handleUpdate} comment={comment} />
              )}
              {!comment.isResolved && (
                <Action
                  as={ReactionPicker}
                  onSelect={handleAddReaction}
                  onOpen={disableScroll}
                  onClose={enableScroll}
                  rounded
                />
              )}
              <Action
                as={CommentMenu}
                comment={comment}
                onEdit={setEditing}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            </Actions>
          )}
        </EventBoundary>
      </Bubble>
    </Flex>
  );
}

const ResolveButton = ({
  comment,
  onUpdate,
}: {
  comment: Comment;
  onUpdate: (attrs: { resolved: boolean }) => void;
}) => {
  const context = useActionContext();
  const { t } = useTranslation();

  return (
    <Tooltip
      content={t("Mark as resolved")}
      placement="top"
      delay={500}
      hideOnClick
    >
      <Action
        as={NudeButton}
        context={context}
        action={resolveCommentFactory({
          comment,
          onResolve: () => onUpdate({ resolved: true }),
        })}
        rounded
      >
        <DoneIcon size={22} outline />
      </Action>
    </Tooltip>
  );
};

const StyledCommentEditor = styled(CommentEditor)`
  ${(props) =>
    !props.readOnly &&
    css`
      box-shadow: 0 0 0 2px ${props.theme.accent};
      border-radius: 2px;
      padding: 2px;
      margin: 2px;
      margin-bottom: 8px;
    `}

  .mention {
    background: ${(props) => darken(0.05, props.theme.mentionBackground)};
  }
`;

const AvatarSpacer = styled(Flex)`
  width: 24px;
  height: 24px;
  margin-top: 4px;
  align-items: flex-end;
  justify-content: flex-end;
  flex-shrink: 0;
  flex-direction: column;
`;

const Body = styled.form`
  border-radius: 2px;
`;

const Action = styled.span<{ rounded?: boolean }>`
  color: ${s("textSecondary")};
  ${(props) =>
    props.rounded &&
    css`
      border-radius: 50%;
    `}

  svg {
    fill: currentColor;
    opacity: 0.5;
  }

  &: ${hover}, &[aria-expanded= "true"] {
    background: ${s("backgroundQuaternary")};

    svg {
      opacity: 0.75;
    }
  }
`;

const Actions = styled(Flex)<{ dir?: "rtl" | "ltr" }>`
  position: absolute;
  left: ${(props) => (props.dir !== "rtl" ? "auto" : "4px")};
  right: ${(props) => (props.dir === "rtl" ? "auto" : "4px")};
  top: 4px;
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  background: ${s("backgroundSecondary")};
  padding-left: 4px;

  &:has(${Action}[aria-expanded="true"]) {
    opacity: 1;
  }
`;

const ReactionListContainer = styled(Flex)`
  margin-top: 6px;
`;

const Meta = styled(Text)`
  margin-bottom: 2px;

  em {
    font-weight: 600;
    font-style: normal;
  }
`;

export const Bubble = styled(Flex)<{
  $firstOfThread?: boolean;
  $firstOfAuthor?: boolean;
  $lastOfThread?: boolean;
  $canReply?: boolean;
  $focused?: boolean;
  $dir?: "rtl" | "ltr";
}>`
  position: relative;
  flex-grow: 1;
  font-size: 16px;
  color: ${s("text")};
  background: ${s("backgroundSecondary")};
  min-width: 2em;
  margin-bottom: 1px;
  padding: 8px 12px;
  transition: color 100ms ease-out, background 100ms ease-out;

  ${({ $lastOfThread, $canReply }) =>
    $lastOfThread &&
    !$canReply &&
    "border-bottom-left-radius: 8px; border-bottom-right-radius: 8px"};

  ${({ $firstOfThread }) =>
    $firstOfThread &&
    "border-top-left-radius: 8px; border-top-right-radius: 8px"};

  margin-left: ${(props) =>
    props.$firstOfAuthor || props.$dir === "rtl" ? 0 : 32}px;
  margin-right: ${(props) =>
    props.$firstOfAuthor || props.$dir !== "rtl" ? 0 : 32}px;

  p:last-child {
    margin-bottom: 0;
  }

  &: ${hover} ${Actions} {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    font-size: 15px;
  `}
`;

export default observer(CommentThreadItem);
