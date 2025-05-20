import styled from "styled-components";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";

export default function FullscreenLoading() {
  return (
    <Fade timing={500}>
      <Centered>
        <Empty>Loading…</Empty>
      </Centered>
    </Fade>
  );
}

const Centered = styled(Flex)`
  text-align: center;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;
