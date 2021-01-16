// @flow
import * as React from "react";
import { cdnPath } from "utils/urls";

type Props = {
  alt: string,
  src: string,
};

export default function Image({ src, alt, ...rest }: Props) {
  return <img src={cdnPath(src)} alt={alt} {...rest} />;
}
