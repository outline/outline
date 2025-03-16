import styled from "styled-components";
import Text from "~/components/Text";

const Empty = styled(Text).attrs({
  type: "tertiary",
  selectable: false,
})``;

export default Empty;
