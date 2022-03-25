import * as React from "react";
import styled from "styled-components";
import { Minute } from "@shared/utils/time";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";
import usePolicy from "~/hooks/usePolicy";

type Props = {
  comment: Comment;
  firstOfThread?: boolean;
  lastOfThread?: boolean;
  firstOfAuthor?: boolean;
  lastOfAuthor?: boolean;
  msSincePreviousComment?: number;
  highlighted?: boolean;
};

export default function CommentThreadItem({
  comment,
  firstOfAuthor,
  firstOfThread,
  lastOfThread,
  msSincePreviousComment,
  highlighted,
}: Props) {
  const can = usePolicy(comment.id);
  const showAuthor = firstOfAuthor;
  const showTime =
    showAuthor ||
    !msSincePreviousComment ||
    msSincePreviousComment > 15 * Minute;

  return (
    <Flex gap={8} key={comment.id} align="flex-start">
      {firstOfAuthor && <Avatar src={comment.createdBy.avatarUrl} />}
      <Bubble
        $highlighted={highlighted}
        $firstOfThread={firstOfThread}
        $firstOfAuthor={firstOfAuthor}
        $lastOfThread={lastOfThread}
        column
      >
        {(showAuthor || showTime) && (
          <Meta size="xsmall" type="secondary">
            {showAuthor && (
              <>
                <em>{comment.createdBy.name}</em> &middot;{" "}
              </>
            )}
            {showTime && (
              <Time dateTime={comment.createdAt} addSuffix shorten />
            )}
          </Meta>
        )}
        <Flex>{comment.data.text}</Flex>
      </Bubble>
    </Flex>
  );
}

const Meta = styled(Text)`
  margin-bottom: 2px;

  em {
    font-weight: 600;
    font-style: normal;
  }
`;

const Bubble = styled(Flex)<{
  $firstOfThread?: boolean;
  $firstOfAuthor?: boolean;
  $lastOfThread?: boolean;
  $highlighted?: boolean;
}>`
  flex-grow: 1;
  font-size: 15px;
  color: ${(props) =>
    props.$highlighted ? props.theme.white : props.theme.text};
  background: ${(props) =>
    props.$highlighted ? props.theme.primary : props.theme.secondaryBackground};
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
`;
