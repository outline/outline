import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https://airtable.com/(?:embed/)?(app.*/)?(shr.*)$"
);

function Airtable(props: Props) {
  const { matches } = props.attrs;
  const appId = matches[1];
  const shareId = matches[2];

  return (
    <Frame
      {...props}
      src={`https://airtable.com/embed/${appId}${shareId}`}
      title={`Airtable (${shareId})`}
      border
    />
  );
}

Airtable.ENABLED = [URL_REGEX];

export default Airtable;
