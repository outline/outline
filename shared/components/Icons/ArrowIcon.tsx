import { ArrowIcon as ArrowRightIcon } from "outline-icons";
import styled from "styled-components";

export { ArrowIcon as ArrowRightIcon } from "outline-icons";

export const ArrowUpIcon = styled(ArrowRightIcon)`
  transform: rotate(-90deg);
`;

export const ArrowDownIcon = styled(ArrowRightIcon)`
  transform: rotate(90deg);
`;

export const ArrowLeftIcon = styled(ArrowRightIcon)`
  transform: rotate(180deg);
`;
