import * as React from "react";
import {
  CompositeStateReturn,
  CompositeItem as BaseCompositeItem,
} from "reakit/Composite";
import Item, { Props as ItemProps } from "./Item";

export type Props = ItemProps & {
  composite: CompositeStateReturn;
};

function CompositeItem(
  { composite, to, ...rest }: Props,
  ref?: React.Ref<HTMLAnchorElement>
) {
  return (
    <BaseCompositeItem as={Item} to={to} {...rest} {...composite} ref={ref} />
  );
}

export default React.forwardRef(CompositeItem);
