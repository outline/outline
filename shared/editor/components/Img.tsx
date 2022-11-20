import * as React from "react";
import { cdnPath } from "../../utils/urls";

type Props = {
  alt: string;
  src: string;
  title?: string;
  width?: number;
  height?: number;
};

/**
 * Component to render a public image loaded from the CDN, if configured.
 */
export default function Image({ src, ...rest }: Props) {
  return <img src={cdnPath(src)} {...rest} />;
}
