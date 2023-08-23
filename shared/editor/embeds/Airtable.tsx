import * as React from "react";
import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const URL_REGEX = new RegExp(
  "^https://airtable.com/(?:app.*/)?(?:embed/)?(shr.*)$"
);

function Airtable(props: Props) {
  const { matches } = props.attrs;
  const shareId = matches[1];
  return (
    <Frame
      {...props}
      src={`https://airtable.com/embed/${shareId}`}
      title={`Airtable (${shareId})`}
      border
    />
  );
}

Airtable.ENABLED = [URL_REGEX];

export default Airtable;
