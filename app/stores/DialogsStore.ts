import { observable, action } from "mobx";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";

type DialogDefinition = {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  style?: React.CSSProperties;
  onClose?: () => void;
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
    id,
    title,
    content,
    replace,
    style,
    onClose,
  }: {
    id?: string;
    title: string;
    content: React.ReactNode;
    style?: React.CSSProperties;
    replace?: boolean;
    onClose?: () => void;
  }) => {
    setTimeout(
      action(() => {
        let replaceId;
        if (replace) {
          replaceId = Array.from(this.modalStack.keys())[0];
          this.modalStack.clear();
        }

        this.modalStack.set(id ?? replaceId ?? uuidv4(), {
          title,
          content,
          style,
          isOpen: true,
          onClose,
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
