import { differenceInMilliseconds } from "date-fns";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { dateToRelative } from "@shared/utils/date";
import { Minute } from "@shared/utils/time";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useBoolean from "~/hooks/useBoolean";
import CommentMenu from "~/menus/CommentMenu";
import { hover } from "~/styles";
import CommentEditor from "./CommentEditor";

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
    (msSincePreviousComment > 15 * Minute &&
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
};

function CommentThreadItem({
  comment,
  firstOfAuthor,
  firstOfThread,
  lastOfThread,
  dir,
  previousCommentCreatedAt,
  canReply,
}: Props) {
  const { editor } = useDocumentContext();
  const { t } = useTranslation();
  const [forceRender, setForceRender] = React.useState(0);
  const [data, setData] = React.useState(toJS(comment.data));
  const showAuthor = firstOfAuthor;
  const showTime = useShowTime(comment.createdAt, previousCommentCreatedAt);
  const showEdited =
    comment.updatedAt && comment.updatedAt !== comment.createdAt;
  const [isEditing, setEditing, setReadOnly] = useBoolean();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleChange = (value: (asString: boolean) => object) => {
    setData(value(false));
  };

  const handleSave = () => {
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setReadOnly();
      await comment.save({
        data,
      });
    } catch (error) {
      setEditing();
      toast.error(t("Error updating comment"));
    }
  };

  const handleDelete = () => {
    editor?.removeComment(comment.id);
  };

  const handleCancel = () => {
    setData(toJS(comment.data));
    setReadOnly();
    setForceRender((s) => ++s);
  };

  React.useEffect(() => {
    setData(toJS(comment.data));
    setForceRender((s) => ++s);
  }, [comment.data]);

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
        <Body ref={formRef} onSubmit={handleSubmit}>
          <StyledCommentEditor
            key={`${forceRender}`}
            readOnly={!isEditing}
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
        </Body>
        {!isEditing && (
          <Menu
            comment={comment}
            onEdit={setEditing}
            onDelete={handleDelete}
            dir={dir}
          />
        )}
      </Bubble>
    </Flex>
  );
}

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

const Menu = styled(CommentMenu)<{ dir?: "rtl" | "ltr" }>`
  position: absolute;
  left: ${(props) => (props.dir !== "rtl" ? "auto" : "4px")};
  right: ${(props) => (props.dir === "rtl" ? "auto" : "4px")};
  top: 4px;
  opacity: 0;
  transition: opacity 100ms ease-in-out;
  color: ${s("textSecondary")};

  &: ${hover}, &[aria-expanded= "true"] {
    opacity: 1;
    background: ${s("sidebarActiveBackground")};
  }
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
  background: ${s("commentBackground")};
  min-width: 2em;
  margin-bottom: 1px;
  padding: 8px 12px;
  transition: color 100ms ease-out, ${s("backgroundTransition")};

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

  &: ${hover} ${Menu} {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    font-size: 15px;
  `}
`;

export default observer(CommentThreadItem);
