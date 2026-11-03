import type * as React from "react";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  /** Provided by react-router's Link and ignored. */
  href?: string;
  /** Provided by react-router's Link and ignored. */
  navigate?: () => void;
  /** Ref forwarded by react-router's Link. */
  innerRef?: React.Ref<HTMLDivElement>;
}

/**
 * A non-navigating replacement for a Link's anchor element, used while a
 * sidebar row is being edited.
 *
 * @param props The props passed through by react-router's Link.
 * @returns A div with the link's presentational props.
 */
export function StaticLink({ href, navigate, innerRef, ...rest }: Props) {
  return <div ref={innerRef} {...rest} />;
}
