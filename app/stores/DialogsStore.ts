import { observable, action } from "mobx";
import { v4 as uuidv4 } from "uuid";
import * as React from "react";

type DialogDefinition = {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
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
    width,
    height,
    onClose,
  }: Omit<DialogDefinition, "isOpen"> & {
    id?: string;
    replace?: boolean;
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
          width,
          height,
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
