import type { ComponentProps } from "../types";
import Node from "./Node";

export default abstract class ReactNode<
  TOptions extends object = object,
> extends Node<TOptions> {
  abstract component: (
    props: Omit<ComponentProps, "theme">
  ) => React.ReactElement;
}
