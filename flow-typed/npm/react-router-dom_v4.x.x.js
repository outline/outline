// flow-typed signature: 493d39fe9968f54f645635dbec3b2d9a
// flow-typed version: 02d9734356/react-router-dom_v4.x.x/flow_>=v0.38.x

declare module 'react-router-dom' {
  declare export class BrowserRouter extends React$Component {
    props: {
      basename?: string,
      forceRefresh?: boolean,
      getUserConfirmation?: GetUserConfirmation,
      keyLength?: number,
      children?: React$Element<*>,
    }
  }

  declare export class HashRouter extends React$Component {
    props: {
      basename?: string,
      getUserConfirmation?: GetUserConfirmation,
      hashType?: 'slash' | 'noslash' | 'hashbang',
      children?: React$Element<*>,
    }
  }

  declare export class Link extends React$Component {
    props: {
      to: string | LocationShape,
      replace?: boolean,
      children?: React$Element<*>,
    }
  }

  declare export class NavLink extends React$Component {
    props: {
      to: string | LocationShape,
      activeClassName?: string,
      className?: string,
      activeStyle?: Object,
      style?: Object,
      isActive?: (match: Match, location: Location) => boolean,
      children?: React$Element<*>,
      exact?: bool,
      strict?: bool,
    }
  }

  // NOTE: Below are duplicated from react-router. If updating these, please
  // update the react-router and react-router-native types as well.
  declare export type Location = {
    pathname: string,
    search: string,
    hash: string,
    state?: any,
    key?: string,
  }

  declare export type LocationShape = {
    pathname?: string,
    search?: string,
    hash?: string,
    state?: any,
  }

  declare export type HistoryAction = 'PUSH' | 'REPLACE' | 'POP'

  declare export type RouterHistory = {
    length: number,
    location: Location,
    action: HistoryAction,
    listen(callback: (location: Location, action: HistoryAction) => void): () => void,
    push(path: string | LocationShape, state?: any): void,
    replace(path: string | LocationShape, state?: any): void,
    go(n: number): void,
    goBack(): void,
    goForward(): void,
    canGo?: (n: number) => bool,
    block(callback: (location: Location, action: HistoryAction) => boolean): void,
    // createMemoryHistory
    index?: number,
    entries?: Array<Location>,
  }

  declare export type Match = {
    params: { [key: string]: ?string },
    isExact: boolean,
    path: string,
    url: string,
  }

  declare export type ContextRouter = {
    history: RouterHistory,
    location: Location,
    match: Match,
  }

  declare export type GetUserConfirmation =
    (message: string, callback: (confirmed: boolean) => void) => void

  declare type StaticRouterContext = {
    url?: string,
  }

  declare export class StaticRouter extends React$Component {
    props: {
      basename?: string,
      location?: string | Location,
      context: StaticRouterContext,
      children?: React$Element<*>,
    }
  }

  declare export class MemoryRouter extends React$Component {
    props: {
      initialEntries?: Array<LocationShape | string>,
      initialIndex?: number,
      getUserConfirmation?: GetUserConfirmation,
      keyLength?: number,
      children?: React$Element<*>,
    }
  }

  declare export class Router extends React$Component {
    props: {
      history: RouterHistory,
      children?: React$Element<*>,
    }
  }

  declare export class Prompt extends React$Component {
    props: {
      message: string | (location: Location) => string | true,
      when?: boolean,
    }
  }

  declare export class Redirect extends React$Component {
    props: {
      to: string | LocationShape,
      push?: boolean,
    }
  }

  declare export class Route extends React$Component {
    props: {
      component?: ReactClass<*>,
      render?: (router: ContextRouter) => React$Element<*>,
      children?: (router: ContextRouter) => React$Element<*>,
      path?: string,
      exact?: bool,
      strict?: bool,
    }
  }

  declare export class Switch extends React$Component {
    props: {
      children?: Array<React$Element<*>>,
    }
  }

  declare type FunctionComponent<P> = (props: P) => ?React$Element<any>;
  declare type ClassComponent<D, P, S> = Class<React$Component<D, P, S>>;
  declare export function withRouter<P, S>(Component: ClassComponent<void, P, S> | FunctionComponent<P>): ClassComponent<void, $Diff<P, ContextRouter>, S>;

  declare type MatchPathOptions = {
    path: string,
    exact?: boolean,
    strict?: boolean,
  }
  declare export function matchPath(pathname: string, options: MatchPathOptions): null | Match
}
