// flow-typed signature: 53be1849af6037db65e90a7abc558afe
// flow-typed version: f4e99ca1ed/react-router-dom_v4.x.x/flow_>=v0.63.x

declare module "react-router-dom" {
  import type { ComponentType, ElementConfig, Node, Component } from 'react';

  declare export var BrowserRouter: Class<Component<{|
    basename?: string,
    forceRefresh?: boolean,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children?: Node
  |}>>

  declare export var HashRouter: Class<Component<{|
    basename?: string,
    getUserConfirmation?: GetUserConfirmation,
    hashType?: "slash" | "noslash" | "hashbang",
    children?: Node
  |}>>

  declare export var Link: Class<Component<{
    className?: string,
    to: string | LocationShape,
    replace?: boolean,
    children?: Node
  }>>

  declare export var NavLink: Class<Component<{
    to: string | LocationShape,
    activeClassName?: string,
    className?: string,
    activeStyle?: Object,
    style?: Object,
    isActive?: (match: Match, location: Location) => boolean,
    children?: Node,
    exact?: boolean,
    strict?: boolean
  }>>

  // NOTE: Below are duplicated from react-router. If updating these, please
  // update the react-router and react-router-native types as well.
  declare export type Location = {
    pathname: string,
    search: string,
    hash: string,
    state?: any,
    key?: string
  };

  declare export type LocationShape = {
    pathname?: string,
    search?: string,
    hash?: string,
    state?: any
  };

  declare export type HistoryAction = "PUSH" | "REPLACE" | "POP";

  declare export type RouterHistory = {
    length: number,
    location: Location,
    action: HistoryAction,
    listen(
      callback: (location: Location, action: HistoryAction) => void
    ): () => void,
    push(path: string | LocationShape, state?: any): void,
    replace(path: string | LocationShape, state?: any): void,
    go(n: number): void,
    goBack(): void,
    goForward(): void,
    canGo?: (n: number) => boolean,
    block(
      callback: (location: Location, action: HistoryAction) => boolean
    ): void,
    // createMemoryHistory
    index?: number,
    entries?: Array<Location>
  };

  declare export type Match = {
    params: { [key: string]: ?string },
    isExact: boolean,
    path: string,
    url: string
  };

  declare export type ContextRouter = {|
    history: RouterHistory,
    location: Location,
    match: Match,
    staticContext?: StaticRouterContext
  |};

  declare type ContextRouterVoid = {
    history: RouterHistory | void,
    location: Location | void,
    match: Match | void,
    staticContext?: StaticRouterContext | void
  };

  declare export type GetUserConfirmation = (
    message: string,
    callback: (confirmed: boolean) => void
  ) => void;

  declare export type StaticRouterContext = {
    url?: string
  };

  declare export var StaticRouter: Class<Component<{|
    basename?: string,
    location?: string | Location,
    context: StaticRouterContext,
    children?: Node
  |}>>

  declare export var MemoryRouter: Class<Component<{|
    initialEntries?: Array<LocationShape | string>,
    initialIndex?: number,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children?: Node
  |}>>

  declare export var Router: Class<Component<{|
    history: RouterHistory,
    children?: Node
  |}>>

  declare export var Prompt: Class<Component<{|
    message: string | ((location: Location) => string | boolean),
    when?: boolean
  |}>>

  declare export var Redirect: Class<Component<{|
    to: string | LocationShape,
    push?: boolean,
    from?: string,
    exact?: boolean,
    strict?: boolean
  |}>>

  declare export var Route: Class<Component<{|
    component?: ComponentType<*>,
    render?: (router: ContextRouter) => Node,
    children?: ComponentType<ContextRouter> | Node,
    path?: string,
    exact?: boolean,
    strict?: boolean,
    location?: LocationShape,
    sensitive?: boolean
  |}>>

  declare export var Switch: Class<Component<{|
    children?: Node,
    location?: Location
  |}>>

  declare export function withRouter<WrappedComponent: ComponentType<*>>(
    Component: WrappedComponent
  ): ComponentType<
    $Diff<ElementConfig<$Supertype<WrappedComponent>>, ContextRouterVoid>
    >;

  declare type MatchPathOptions = {
    path?: string,
    exact?: boolean,
    sensitive?: boolean,
    strict?: boolean
  };

  declare export function matchPath(
    pathname: string,
    options?: MatchPathOptions | string,
    parent?: Match
  ): null | Match;

  declare export function generatePath(pattern?: string, params?: Object): string;
}
