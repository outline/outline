// @flow
import { observable, action } from "mobx";
import * as React from "react";

export default class DialogsStore {
  @observable guide: {
    title: string,
    content: React.Node,
    isOpen: boolean,
  };
  @observable modalStack: {
    title: string,
    content: React.Node,
  }[];

  @action
  openGuide = ({ title, content }: { title: string, content: React.Node }) => {
    this.guide = { title, content, isOpen: true };
  };

  @action
  closeGuide = () => {
    if (this.guide) {
      this.guide.isOpen = false;
    }
  };

  @action
  openModal = ({
    title,
    content,
    replace,
  }: {
    title: string,
    content: React.Node,
    replace?: boolean,
  }) => {
    //
  };
}
