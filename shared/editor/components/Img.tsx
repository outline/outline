import * as React from "react";
import { cdnPath } from "../../utils/urls";

type Props = {
  alt: string;
  src: string;
  title?: string;
  width?: number;
  height?: number;
};

export default function Img({ src, alt, ...rest }: Props) {
  return <img src={cdnPath(src)} alt={alt} {...rest} />;
}
