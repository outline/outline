// flow-typed signature: 919d09445f69c0a85f337d1cdb035dc3
// flow-typed version: b63741deb2/react-modal_v3.1.x/flow_>=v0.54.1

declare module 'react-modal' {
  declare type DefaultProps = {
    isOpen?: boolean,
    portalClassName?: string,
    bodyOpenClassName?: string,
    ariaHideApp?: boolean,
    closeTimeoutMS?: number,
    shouldFocusAfterRender?: boolean,
    shouldCloseOnEsc?: boolean,
    shouldCloseOnOverlayClick?: boolean,
    shouldReturnFocusAfterClose?: boolean,
    parentSelector?: () => HTMLElement,
  };

  declare type Props = DefaultProps & {
    style?: {
      content?: {
        [key: string]: string | number
      },
      overlay?: {
        [key: string]: string | number
      }
    },
    className?: string | {
      base: string,
      afterOpen: string,
      beforeClose: string
    },
    overlayClassName?: string | {
      base: string,
      afterOpen: string,
      beforeClose: string
    },
    appElement?: HTMLElement | string | null,
    onAfterOpen?: () => void,
    onRequestClose?: () => void,
    aria?: {
      [key: string]: string
    },
    role?: string,
    contentLabel?: string
  };

  declare class Modal extends React$Component<Props> {
    static setAppElement(element: HTMLElement | string | null): void;
  }

  declare module.exports: typeof Modal;
}
