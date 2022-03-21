import * as React from "react";
import styled from "styled-components";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Time from "~/components/Time";

type Props = {
  comment: Comment;
  firstOfAuthor?: boolean;
  lastOfAuthor?: boolean;
  secondsSincePreviousComment?: number;
  highlighted?: boolean;
};

export default function CommentListItem({
  comment,
  firstOfAuthor,
  lastOfAuthor,
  secondsSincePreviousComment,
  highlighted,
}: Props) {
  const showAuthor = firstOfAuthor;
  const showTime =
    !secondsSincePreviousComment || secondsSincePreviousComment > 900;

  return (
    <Flex gap={8} key={comment.id} align="flex-end">
      {lastOfAuthor && <Avatar src={comment.createdBy.avatarUrl} />}
      <Wrapper $lastOfAuthor={lastOfAuthor} column>
        {(showAuthor || showTime) && (
          <Meta size="xsmall" type="secondary">
            {showAuthor && comment.createdBy.name}
            {showTime && (
              <Time dateTime={comment.createdAt} addSuffix shorten />
            )}
          </Meta>
        )}
        <Bubble $lastOfAuthor={lastOfAuthor} $highlighted={highlighted}>
          {comment.data.text}
        </Bubble>
      </Wrapper>
    </Flex>
  );
}

const Meta = styled(Text)`
  margin-top: 1em;
  margin-bottom: 2px;
`;

const Bubble = styled.div<{ $lastOfAuthor?: boolean; $highlighted?: boolean }>`
  font-size: 15px;
  color: ${(props) =>
    props.$highlighted ? props.theme.white : props.theme.text};
  background: ${(props) =>
    props.$highlighted ? props.theme.primary : props.theme.secondaryBackground};
  border-radius: 1em;
  min-width: 2em;
  padding: 4px 8px;
  margin-bottom: 4px;
  transition: color 100ms ease-out,
    ${(props) => props.theme.backgroundTransition};

  ${({ $lastOfAuthor }) => $lastOfAuthor && "border-bottom-left-radius: 0"};

  p:last-child {
    margin-bottom: 0;
  }
`;

const Wrapper = styled(Flex)<{ $lastOfAuthor?: boolean }>`
  margin-left: ${(props) => (props.$lastOfAuthor ? 0 : 32)}px;
`;
