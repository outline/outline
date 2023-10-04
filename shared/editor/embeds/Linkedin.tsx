import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

function Linkedin(props: Props) {
  const { matches } = props.attrs;
  const source = matches[0];
  return <Frame {...props} src={source} title="Linkedin" />;
}

Linkedin.ENABLED = [new RegExp("^https://www.linkedin.com/embed/?(.*)$")];

export default Linkedin;
