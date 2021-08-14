// @flow
import * as React from "react";
import styled from "styled-components";
import Disclosure from "./Disclosure";

const DisclosureWrapper = ({
  children,
  handleExpanded,
}: {
  children: React.Node,
  handleExpanded: (boolean) => void,
}) => {
  const [showDisclosure, setShowDisclosure] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const handleDisclosureClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();
      setExpanded(!expanded);
      handleExpanded(!expanded);
    },
    [expanded, handleExpanded]
  );

  return (
    <div
      onMouseOver={() => setShowDisclosure(true)}
      onMouseLeave={() => setShowDisclosure(false)}
    >
      {(showDisclosure || expanded) && (
        <PaddedDisclosure expanded={expanded} onClick={handleDisclosureClick} />
      )}
      {children}
    </div>
  );
};

const PaddedDisclosure = styled(Disclosure)`
  left: 10px;
`;

export default DisclosureWrapper;
