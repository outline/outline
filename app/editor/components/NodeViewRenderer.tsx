import isEqual from "lodash/isEqual";
import { action, computed, observable } from "mobx";
import React, { FunctionComponent } from "react";
import { createPortal } from "react-dom";

export class NodeViewRenderer<T extends object> {
  @observable public props: T;

  public constructor(
    public element: HTMLElement,
    private Component: FunctionComponent,
    props: T
  ) {
    this.props = props;
  }

  @computed
  public get content() {
    return createPortal(<this.Component {...this.props} />, this.element);
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
