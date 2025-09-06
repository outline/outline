import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function InVision({ matches, ...props }: Props) {
  return <Frame {...props} src={props.attrs.href} title="InVision Embed" />;
}

export default InVision;
