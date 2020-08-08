// flow-typed signature: 33bc320ebb5343629e228a9caa367310
// flow-typed version: c4f47bdda4/react-router-dom_v5.x.x/flow_>=v0.104.x

declare module "react-router-dom" {
  declare export var BrowserRouter: React$ComponentType<{|
    basename?: string,
    forceRefresh?: boolean,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children?: React$Node
  |}>

  declare export var HashRouter: React$ComponentType<{|
    basename?: string,
    getUserConfirmation?: GetUserConfirmation,
    hashType?: "slash" | "noslash" | "hashbang",
    children?: React$Node
  |}>

  declare export var Link: React$ComponentType<{
    +className?: string,
    +to: string | LocationShape,
    +replace?: boolean,
    +children?: React$Node,
    ...
  }>

  declare export var NavLink: React$ComponentType<{
    +to: string | LocationShape,
    +activeClassName?: string,
    +className?: string,
    +activeStyle?: { +[string]: mixed, ... },
    +style?: { +[string]: mixed, ... },
    +isActive?: (match: Match, location: Location) => boolean,
    +children?: React$Node,
    +exact?: boolean,
    +strict?: boolean,
    ...
  }>

  // NOTE: Below are duplicated from react-router. If updating these, please
  // update the react-router and react-router-native types as well.
  declare export type Location = {
    pathname: string,
    search: string,
    hash: string,
    ...
  };

  declare export type LocationShape = {
    pathname?: string,
    search?: string,
    hash?: string,
    ...
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
      callback: string | (location: Location, action: HistoryAction) => ?string
    ): () => void,
    ...
  };

  declare export type Match = {
    params: { [key: string]: ?string, ... },
    isExact: boolean,
    path: string,
    url: string,
    ...
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
    staticContext?: StaticRouterContext | void,
    ...
  };

  declare export type GetUserConfirmation = (
    message: string,
    callback: (confirmed: boolean) => void
  ) => void;

  declare export type StaticRouterContext = { url?: string, ... };

  declare export var StaticRouter: React$ComponentType<{|
    basename?: string,
    location?: string | Location,
    context: StaticRouterContext,
    children?: React$Node
  |}>

  declare export var MemoryRouter: React$ComponentType<{|
    initialEntries?: Array<LocationShape | string>,
    initialIndex?: number,
    getUserConfirmation?: GetUserConfirmation,
    keyLength?: number,
    children?: React$Node
  |}>

  declare export var Router: React$ComponentType<{|
    history: RouterHistory,
    children?: React$Node
  |}>

  declare export var Prompt: React$ComponentType<{|
    message: string | ((location: Location) => string | boolean),
    when?: boolean
  |}>

  declare export var Redirect: React$ComponentType<{|
    to: string | LocationShape,
    push?: boolean,
    from?: string,
    exact?: boolean,
    strict?: boolean
  |}>

  declare export var Route: React$ComponentType<{|
    component?: React$ComponentType<*>,
    render?: (router: ContextRouter) => React$Node,
    children?: React$ComponentType<ContextRouter> | React$Node,
    path?: string | Array<string>,
    exact?: boolean,
    strict?: boolean,
    location?: LocationShape,
    sensitive?: boolean
  |}>

  declare export var Switch: React$ComponentType<{|
    children?: React$Node,
    location?: Location
  |}>

  declare export function withRouter<Props: {...}, Component: React$ComponentType<Props>>(
    WrappedComponent: Component
  ): React$ComponentType<$Diff<React$ElementConfig<Component>, ContextRouterVoid>>;

  declare type MatchPathOptions = {
    path?: string | string[],
    exact?: boolean,
    sensitive?: boolean,
    strict?: boolean,
    ...
  };

  declare export function matchPath(
    pathname: string,
    options?: MatchPathOptions | string | string[],
    parent?: Match
  ): null | Match;

  declare export function useHistory(): $PropertyType<ContextRouter, 'history'>;
  declare export function useLocation(): $PropertyType<ContextRouter, 'location'>;
  declare export function useParams(): $PropertyType<$PropertyType<ContextRouter, 'match'>, 'params'>;
  declare export function useRouteMatch(path?: MatchPathOptions | string | string[]): $PropertyType<ContextRouter, 'match'>;

  declare export function generatePath(pattern?: string, params?: { +[string]: mixed, ... }): string;
}
