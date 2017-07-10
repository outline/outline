// flow-typed signature: fe7abf92d2b0a6cb8907b2ea573c8586
// flow-typed version: e06e1b48c4/react-addons-css-transition-group_v15.x.x/flow_>=v0.26.x

declare module 'react-addons-css-transition-group' {
  declare type ReactCSSTransitionGroupNames = {
    enter: string,
    enterActive?: string,
    leave: string,
    leaveActive?: string,
    appear: string,
    appearActive?: string
  };
  declare type Props = {
    transitionName: string | ReactCSSTransitionGroupNames,
    transitionAppear?: boolean,
    transitionEnter?: boolean,
    transitionLeave?: boolean,
    transitionAppearTimeout?: number,
    transitionEnterTimeout?: number,
    transitionLeaveTimeout?: number,
  };
  declare type DefaultProps = {
    transitionAppear: boolean,
    transitionEnter: boolean,
    transitionLeave: boolean,
  }
  declare class ReactCSSTransitionGroup extends React$Component<DefaultProps, Props, any> {
    props: Props;
    static defaultProps: DefaultProps;
  }
  declare module.exports: Class<ReactCSSTransitionGroup>;
}
