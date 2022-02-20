import { CollapsedIcon } from "outline-icons";
import styled from "styled-components";
import Flex from "~/components/Flex";

const Header = styled(Flex)`
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  color: ${(props) => props.theme.textTertiary};
  letter-spacing: 0.03em;
  margin: 4px 12px;
`;

const Disclosure = styled(CollapsedIcon)<{ expanded?: boolean }>`
  transition: transform 100ms ease, fill 50ms !important;
  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default Header;
