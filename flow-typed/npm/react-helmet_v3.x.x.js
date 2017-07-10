// flow-typed signature: 7ee00cf01ba33eeba35dee9d286ece86
// flow-typed version: 0d0440f3d3/react-helmet_v3.x.x/flow_>=v0.26.x

declare module 'react-helmet' {
  declare type Props = {
    htmlAttributes?: Object,
    title?: string,
    defaultTitle?: string,
    titleTemplate?: string,
    base?: Object,
    meta?: Array<Object>,
    link?: Array<Object>,
    script?: Array<Object>,
    noscript?: Array<Object>,
    style?: Array<Object>,
    onChangeClientState?: (newState: Object, addedTags: Object, removeTags: Object) => void | mixed,
  };
  declare interface HeadAttribute {
    toString(): string;
    toComponent(): React$Element<*>;
  }
  declare interface Head {
    htmlAttributes: HeadAttribute;
    title: HeadAttribute;
    base: HeadAttribute;
    meta: HeadAttribute;
    link: HeadAttribute;
    script: HeadAttribute;
    style: HeadAttribute;
  }

  declare class Helmet extends React$Component {
    static rewind(): Head;
    props: Props;
  }
  declare var exports: typeof Helmet;
}
