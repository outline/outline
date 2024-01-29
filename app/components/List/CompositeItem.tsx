import * as React from "react";
import {
  CompositeStateReturn,
  CompositeItem as BaseCompositeItem,
} from "reakit/Composite";
import Item, { Props as ItemProps } from "./Item";

export type Props = ItemProps & CompositeStateReturn;

function CompositeItem(
  { to, ...rest }: Props,
  ref?: React.Ref<HTMLAnchorElement>
) {
  return <BaseCompositeItem as={Item} to={to} {...rest} ref={ref} />;
}

export default React.forwardRef(CompositeItem);
