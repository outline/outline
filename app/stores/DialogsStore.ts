import { observable, action } from "mobx";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

type DialogDefinition = {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  fullscreen?: boolean;
  style?: React.CSSProperties;
};

export default class DialogsStore {
  @observable
  guide: DialogDefinition;

  @observable
  modalStack = new Map<string, DialogDefinition>();

  openGuide = ({
    title,
    content,
  }: {
    title: string;
    content: React.ReactNode;
  }) => {
    setTimeout(
      action(() => {
        this.guide = {
          title,
          content,
          isOpen: true,
        };
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
    fullscreen,
    replace,
    style,
  }: {
    title: string;
    fullscreen?: boolean;
    content: React.ReactNode;
    style?: React.CSSProperties;
    replace?: boolean;
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
          fullscreen,
          style,
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
