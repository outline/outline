import { differenceInMilliseconds, formatDistanceToNow } from "date-fns";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { Minute } from "@shared/utils/time";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useBoolean from "~/hooks/useBoolean";
import useToasts from "~/hooks/useToasts";
import CommentMenu from "~/menus/CommentMenu";
import CommentEditor from "./CommentEditor";
//import usePolicy from "~/hooks/usePolicy";

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
    ? formatDistanceToNow(Date.parse(previousCreatedAt))
    : undefined;
  const currentTimeStamp = formatDistanceToNow(Date.parse(createdAt));

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
  comment: Comment;
  firstOfThread?: boolean;
  lastOfThread?: boolean;
  firstOfAuthor?: boolean;
  lastOfAuthor?: boolean;
  previousCommentCreatedAt?: string;
};

function CommentThreadItem({
  comment,
  firstOfAuthor,
  firstOfThread,
  lastOfThread,
  previousCommentCreatedAt,
}: Props) {
  //const can = usePolicy(comment.id);
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const [forceRender, setForceRender] = React.useState(0);
  const [data, setData] = React.useState(toJS(comment.data));
  const showAuthor = firstOfAuthor;
  const showTime = useShowTime(comment.createdAt, previousCommentCreatedAt);
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
      showToast(t("Error updating comment"), { type: "error" });
    }
  };

  const handleDelete = () => {
    // comment should be removed as mark.
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
    <Flex gap={8} align="flex-start">
      {firstOfAuthor && (
        <AvatarSpacer>
          <Avatar model={comment.createdBy} size={24} />
        </AvatarSpacer>
      )}
      <Bubble
        $firstOfThread={firstOfThread}
        $firstOfAuthor={firstOfAuthor}
        $lastOfThread={lastOfThread}
        column
      >
        {(showAuthor || showTime) && (
          <Meta size="xsmall" type="secondary">
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
              <Button type="submit" borderOnHover>
                {t("Save")}
              </Button>
              <Button onClick={handleCancel} neutral borderOnHover>
                {t("Cancel")}
              </Button>
            </Flex>
          )}
        </Body>
        {!isEditing && (
          <Menu comment={comment} onEdit={setEditing} onDelete={handleDelete} />
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
`;

const AvatarSpacer = styled(Flex)`
  width: 24px;
  height: 24px;
  align-items: flex-end;
  justify-content: flex-end;
  flex-direction: column;
`;

const Body = styled.form`
  border-radius: 2px;
`;

const Menu = styled(CommentMenu)`
  position: absolute;
  right: 4px;
  top: 4px;
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:hover,
  &[aria-expanded="true"] {
    opacity: 1;
    background: ${(props) => props.theme.sidebarActiveBackground};
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
  $focused?: boolean;
}>`
  position: relative;
  flex-grow: 1;
  font-size: 15px;
  color: ${(props) => props.theme.text};
  background: ${(props) => props.theme.commentBackground};
  min-width: 2em;
  margin-bottom: 1px;
  padding: 8px 12px;
  transition: color 100ms ease-out,
    ${(props) => props.theme.backgroundTransition};

  ${({ $lastOfThread }) =>
    $lastOfThread &&
    "border-bottom-left-radius: 8px; border-bottom-right-radius: 8px"};

  ${({ $firstOfThread }) =>
    $firstOfThread &&
    "border-top-left-radius: 8px; border-top-right-radius: 8px"};

  margin-left: ${(props) => (props.$firstOfAuthor ? 0 : 32)}px;

  p:last-child {
    margin-bottom: 0;
  }

  &:hover ${Menu} {
    opacity: 1;
  }
`;

export default observer(CommentThreadItem);
