import copy from "copy-to-clipboard";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import env from "~/env";

type ChildProps = {
  onClick?: React.MouseEventHandler<HTMLElement>;
  ref?: React.Ref<HTMLElement>;
};

type Props = {
  text: string;
  children?: React.ReactElement<ChildProps>;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onCopy?: () => void;
};

function CopyToClipboard(props: Props, ref: React.Ref<HTMLElement>) {
  const { text, onCopy, children, ...rest } = props;

  const onClick = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      const childElem = React.Children.only(children);

      copy(text, {
        debug: env.ENVIRONMENT !== "production",
        format: "text/plain",
      });

      onCopy?.();

      if (
        childElem &&
        childElem.props &&
        typeof childElem.props.onClick === "function"
      ) {
        childElem.props.onClick(ev);
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
    ref: elem.props.ref ? mergeRefs([elem.props.ref, ref]) : ref,
    onClick,
  });
}

export default React.forwardRef(CopyToClipboard);
