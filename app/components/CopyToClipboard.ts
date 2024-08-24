import copy from "copy-to-clipboard";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import env from "~/env";

type Props = {
  text: string;
  children?: React.ReactElement;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onCopy?: () => void;
};

function CopyToClipboard(props: Props, ref: React.Ref<HTMLElement>) {
  const { text, onCopy, children, ...rest } = props;

  const onClick = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      const elem = React.Children.only(children);

      copy(text, {
        debug: env.ENVIRONMENT !== "production",
        format: "text/plain",
      });

      onCopy?.();

      if (elem && elem.props && typeof elem.props.onClick === "function") {
        elem.props.onClick(ev);
      } else {
        ev.preventDefault();
        ev.stopPropagation();
      }
    },
    [children, onCopy, text]
  );

  const elem = React.Children.only(children);
  if (!elem) {
    return null;
  }

  return React.cloneElement(elem, {
    ...rest,
    ref:
      "ref" in elem
        ? mergeRefs([elem.ref as React.MutableRefObject<HTMLElement>, ref])
        : ref,
    onClick,
  });
}

export default React.forwardRef(CopyToClipboard);
