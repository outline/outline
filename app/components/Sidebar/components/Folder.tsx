import * as React from "react";
import styled from "styled-components";

type Props = {
  expanded: boolean;
  children?: React.ReactNode;
};

const Folder: React.FC<Props> = ({ expanded, children }: Props) => {
  const [openedOnce, setOpenedOnce] = React.useState(expanded);

  // allows us to avoid rendering all children when the folder hasn't been opened
  React.useEffect(() => {
    if (expanded) {
      setOpenedOnce(true);
    }
  }, [expanded]);

  if (!openedOnce) {
    return null;
  }

  return <Wrapper $expanded={expanded}>{children}</Wrapper>;
};

const Wrapper = styled.div<{ $expanded?: boolean }>`
  display: ${(props) => (props.$expanded ? "block" : "none")};
`;

export default Folder;
