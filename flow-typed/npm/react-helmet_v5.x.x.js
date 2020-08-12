// flow-typed signature: ade4974e89a074e7af4636c11b4a766b
// flow-typed version: c6154227d1/react-helmet_v5.x.x/flow_>=v0.104.x

declare module 'react-helmet' {
  declare type Props = {
    base?: Object,
    bodyAttributes?: Object,
    children?: React$Node,
    defaultTitle?: string,
    defer?: boolean,
    encodeSpecialCharacters?: boolean,
    htmlAttributes?: Object,
    link?: Array<Object>,
    meta?: Array<Object>,
    noscript?: Array<Object>,
    onChangeClientState?: (
      newState?: Object,
      addedTags?: Object,
      removeTags?: Object
    ) => any,
    script?: Array<Object>,
    style?: Array<Object>,
    title?: string,
    titleAttributes?: Object,
    titleTemplate?: string,
    ...
  }

  declare interface TagMethods {
    toString(): string;
    toComponent(): [React$Element<*>] | React$Element<*> | Array<Object>;
  }

  declare interface AttributeTagMethods {
    toString(): string;
    toComponent(): { [string]: *, ... };
  }

  declare interface StateOnServer {
    base: TagMethods;
    bodyAttributes: AttributeTagMethods,
    htmlAttributes: AttributeTagMethods;
    link: TagMethods;
    meta: TagMethods;
    noscript: TagMethods;
    script: TagMethods;
    style: TagMethods;
    title: TagMethods;
  }

  declare class Helmet extends React$Component<Props> {
    static rewind(): StateOnServer;
    static renderStatic(): StateOnServer;
    static canUseDom(canUseDOM: boolean): void;
  }

  declare export default typeof Helmet
  declare export var Helmet: typeof Helmet
}

