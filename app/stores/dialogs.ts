import type * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

/** A modal dialog on the stack. */
export interface DialogDefinition {
  title: React.ReactNode;
  content: React.ReactNode;
  isOpen: boolean;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  onClose?: () => void;
}

/** The single guide panel, shown at most one at a time. */
export interface GuideDefinition {
  title: string;
  content: React.ReactNode;
  isOpen: boolean;
}

interface DialogsState {
  /** The currently defined guide, if one has been opened. */
  guide?: GuideDefinition;
  /** The open modals, keyed by id, in the order they were opened. */
  modalStack: Map<string, DialogDefinition>;
  openGuide: (options: { title: string; content: React.ReactNode }) => void;
  closeGuide: () => void;
  openModal: (
    options: Omit<DialogDefinition, "isOpen"> & {
      id?: string;
      replace?: boolean;
    }
  ) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

/**
 * Dialog state for guides and the modal stack.
 *
 * Opening is deferred by a tick so that a dialog opened from within an event
 * handler does not render while the triggering interaction is still settling –
 * the behaviour the previous MobX store relied on.
 */
export const useDialogs = create<DialogsState>((set, get) => ({
  guide: undefined,
  modalStack: new Map(),

  openGuide: ({ title, content }) => {
    setTimeout(() => {
      set({ guide: { title, content, isOpen: true } });
    }, 0);
  },

  closeGuide: () => {
    const { guide } = get();
    if (guide) {
      set({ guide: { ...guide, isOpen: false } });
    }
  },

  openModal: ({
    id,
    title,
    content,
    replace,
    style,
    width,
    height,
    onClose,
  }) => {
    setTimeout(() => {
      set((state) => {
        const replaceId = replace
          ? Array.from(state.modalStack.keys())[0]
          : undefined;
        const modalStack = replace ? new Map() : new Map(state.modalStack);

        modalStack.set(id ?? replaceId ?? uuidv4(), {
          title,
          content,
          style,
          width,
          height,
          isOpen: true,
          onClose,
        });

        return { modalStack };
      });
    }, 0);
  },

  closeModal: (id) => {
    set((state) => {
      const modalStack = new Map(state.modalStack);
      modalStack.delete(id);
      return { modalStack };
    });
  },

  closeAllModals: () => {
    set({ modalStack: new Map() });
  },
}));

/**
 * The dialog actions and current state, for callers outside React.
 *
 * `useStores().dialogs` resolves here, so the many call sites that only open or
 * close a dialog keep working unchanged.
 *
 * @returns the dialogs store state.
 */
export function getDialogs(): DialogsState {
  return useDialogs.getState();
}
