import { observable, action } from "mobx";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

type DialogDefinition = {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  isCentered?: boolean;
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
    isCentered,
    replace,
  }: {
    title: string;
    isCentered?: boolean;
    content: React.ReactNode;
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
          isOpen: true,
          isCentered,
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
