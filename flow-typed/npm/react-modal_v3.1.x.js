// flow-typed signature: 096d0e067d7269fca81b46322149e3f5
// flow-typed version: c6154227d1/react-modal_v3.1.x/flow_>=v0.104.x

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
    ...
  };

  declare type Props = DefaultProps & {
    style?: {
      content?: { [key: string]: string | number, ... },
      overlay?: { [key: string]: string | number, ... },
      ...
    },
    className?: string | {
      base: string,
      afterOpen: string,
      beforeClose: string,
      ...
    },
    overlayClassName?: string | {
      base: string,
      afterOpen: string,
      beforeClose: string,
      ...
    },
    appElement?: HTMLElement | string | null,
    onAfterOpen?: () => void | Promise<void>,
    onRequestClose?: (SyntheticEvent<>) => void,
    aria?: { [key: string]: string, ... },
    role?: string,
    contentLabel?: string,
    ...
  };

  declare class Modal extends React$Component<Props> {
    static setAppElement(element: HTMLElement | string | null): void;
  }

  declare module.exports: typeof Modal;
}
