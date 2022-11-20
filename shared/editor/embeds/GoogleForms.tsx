import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function GoogleForms(props: Props) {
  return (
    <Frame
      {...props}
      src={props.attrs.href.replace(
        /\/(edit|viewform)(\?.+)?$/,
        "/viewform?embedded=true"
      )}
      icon={
        <Image
          src="/images/google-forms.png"
          alt="Google Forms Icon"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      title="Google Forms"
      border
    />
  );
}

GoogleForms.ENABLED = [
  new RegExp("^https?://docs\\.google\\.com/forms/d/(.+)$"),
];

export default GoogleForms;
