import * as React from "react";
import styled from "styled-components";
import DelayedMount from "~/components/DelayedMount";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import PlaceholderText from "~/components/PlaceholderText";

export default function PlaceholderDocument({
  includeTitle,
  delay,
}: {
  includeTitle?: boolean;
  delay?: number;
}) {
  const content = (
    <>
      <PlaceholderText delay={0.2} />
      <PlaceholderText delay={0.4} />
      <PlaceholderText delay={0.6} />
    </>
  );

  if (includeTitle === false) {
    return (
      <DelayedMount delay={delay}>
        <Fade>
          <Flex column auto>
            {content}
          </Flex>
        </Fade>
      </DelayedMount>
    );
  }

  return (
    <DelayedMount delay={delay}>
      <Wrapper>
        <Fade>
          <Flex column auto>
            <PlaceholderText height={34} maxWidth={70} />
            <PlaceholderText delay={0.2} maxWidth={40} />
            <br />

            {content}
          </Flex>
        </Fade>
      </Wrapper>
    </DelayedMount>
  );
}

const Wrapper = styled(Fade)`
  display: block;
  margin: 40px 0;
`;
