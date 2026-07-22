import { isEqual } from "es-toolkit/compat";
import { action, computed, observable } from "mobx";
import type { FunctionComponent, ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The minimal shape the editor needs to include a renderer's React content in
 * its shared tree. Both node views and decoration widgets satisfy this.
 */
export interface PortalRenderer {
  readonly content: ReactNode;
}

let nextRendererId = 0;

export class NodeViewRenderer<T extends object> implements PortalRenderer {
  @observable public props: T;

  /**
   * Stable identity used as the React key when renderers are rendered
   */
  public readonly key = `renderer-${nextRendererId++}`;

  public constructor(
    public element: HTMLElement,
    private Component: FunctionComponent<T>,
    props: T
  ) {
    this.props = props;
  }

  @computed
  public get content() {
    return createPortal(
      <this.Component {...this.props} />,
      this.element,
      this.key
    );
  }

  @action
  public updateProps(props: T) {
    if (!isEqual(props, this.props)) {
      this.props = props;
    }
  }

  @action
  public setProp<K extends keyof T>(key: K, value: T[K]) {
    this.props[key] = value;
  }
}
