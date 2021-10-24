// @flow
import { observable, action } from "mobx";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

export default class DialogsStore {
  @observable guide: {
    title: string,
    content: React.Node,
    isOpen: boolean,
  };
  @observable modalStack = new Map<
    string,
    {
      title: string,
      content: React.Node,
      isOpen: boolean,
    }
  >();

  openGuide = ({ title, content }: { title: string, content: React.Node }) => {
    setTimeout(
      action(() => {
        this.guide = { title, content, isOpen: true };
      }),
      0
    );
  };

  @action
  closeGuide = () => {
    if (this.guide) {
      this.guide.isOpen = false;
    }
  };

  openModal = ({
    title,
    content,
    replace,
  }: {
    title: string,
    content: React.Node,
    replace?: boolean,
  }) => {
    setTimeout(
      action(() => {
        const id = uuidv4();

        if (replace) {
          this.modalStack.clear();
        }

        this.modalStack.set(id, {
          title,
          content,
          isOpen: true,
        });
      }),
      0
    );
  };

  @action
  closeModal = (id: string) => {
    this.modalStack.delete(id);
  };

  @action
  closeAllModals = () => {
    this.modalStack.clear();
  };
}
