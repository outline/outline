// flow-typed signature: ce09cfddc81b167b0a751ef4cd182f77
// flow-typed version: 76d655b490/styled-components_v3.x.x/flow_>=v0.57.x

// @flow

type $npm$styledComponents$Interpolation = (<C: {}>(executionContext: C) => string) | string | number;
type $npm$styledComponents$NameGenerator = (hash: number) => string;

type $npm$styledComponents$TaggedTemplateLiteral<R> = {| (Array<string>, $npm$styledComponents$Interpolation): R |};

// ---- FUNCTIONAL COMPONENT DEFINITIONS ----
type $npm$styledComponents$ReactComponentFunctional<Props, DefaultProps = *> =
  & { defaultProps: DefaultProps }
  & $npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<Props>

type $npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<Props> =
  React$StatelessFunctionalComponent<Props>

// ---- CLASS COMPONENT DEFINITIONS ----
class $npm$styledComponents$ReactComponent<Props, DefaultProps> extends React$Component<Props> {
  static defaultProps: DefaultProps
}
type $npm$styledComponents$ReactComponentClass<Props, DefaultProps = *> = Class<$npm$styledComponents$ReactComponent<Props, DefaultProps>>
type $npm$styledComponents$ReactComponentClassUndefinedDefaultProps<Props> = Class<React$Component<Props, *>>

// ---- COMPONENT FUNCTIONS INPUT (UNION) & OUTPUT (INTERSECTION) ----
type $npm$styledComponents$ReactComponentUnion<Props> =
  $npm$styledComponents$ReactComponentUnionWithDefaultProps<Props, *>

type $npm$styledComponents$ReactComponentUnionWithDefaultProps<Props, DefaultProps> =
  | $npm$styledComponents$ReactComponentFunctional<Props, DefaultProps>
  | $npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<Props>
  | $npm$styledComponents$ReactComponentClass<Props, DefaultProps>
  | $npm$styledComponents$ReactComponentClassUndefinedDefaultProps<Props>

type $npm$styledComponents$ReactComponentIntersection<Props, DefaultProps = *> =
  & $npm$styledComponents$ReactComponentFunctional<Props, DefaultProps>
  & $npm$styledComponents$ReactComponentClass<Props, DefaultProps>;

// ---- WITHCOMPONENT ----
type $npm$styledComponents$ReactComponentStyledWithComponent<ComponentList> = <
  Props, DefaultProps,
  Input:
    | ComponentList
    | $npm$styledComponents$ReactComponentStyled<Props, DefaultProps>
    | $npm$styledComponents$ReactComponentUnionWithDefaultProps<Props, DefaultProps>
>(Input) => $npm$styledComponents$ReactComponentStyled<Props, DefaultProps>

// ---- STATIC PROPERTIES ----
type $npm$styledComponents$ReactComponentStyledStaticProps<Props, ComponentList> = {|
  attrs: <AdditionalProps: {}>(AdditionalProps) => $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteral<Props & AdditionalProps, ComponentList>,
  extend: $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteral<Props, ComponentList>,
|}

type $npm$styledComponents$ReactComponentStyledStaticPropsWithComponent<Props, ComponentList> = {|
  withComponent: $npm$styledComponents$ReactComponentStyledWithComponent<ComponentList>,
  attrs: <AdditionalProps: {}>(AdditionalProps) => $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<Props & AdditionalProps, ComponentList>,
  extend: $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<Props, ComponentList>,
|}

// ---- STYLED FUNCTION ----
// Error: styled(CustomComponent).withComponent('a')
// Ok:    styled('div').withComponent('a')
type $npm$styledComponents$Call<ComponentListKeys> =
  & (ComponentListKeys => $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<{}, ComponentListKeys>)
  & (<Props>($npm$styledComponents$ReactComponentUnion<Props>) => $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteral<Props, ComponentListKeys>)

// ---- STYLED COMPONENT ----
type $npm$styledComponents$ReactComponentStyled<Props, ComponentList, DefaultProps = *> =
  & $npm$styledComponents$ReactComponentStyledStaticPropsWithComponent<Props, ComponentList>
  & $npm$styledComponents$ReactComponentIntersection<Props, DefaultProps>

// ---- TAGGED TEMPLATE LITERAL ----
type $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteral<Props, ComponentList> =
  & $npm$styledComponents$ReactComponentStyledStaticProps<Props, ComponentList>
  & $npm$styledComponents$TaggedTemplateLiteral<$npm$styledComponents$ReactComponentStyled<Props, ComponentList>>

type $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<Props, ComponentList> =
  & $npm$styledComponents$ReactComponentStyledStaticPropsWithComponent<Props, ComponentList>
  & $npm$styledComponents$TaggedTemplateLiteral<$npm$styledComponents$ReactComponentStyled<Props, ComponentList>>

// ---- WITHTHEME ----
type $npm$styledComponents$WithThemeReactComponentClass = <
  InputProps: { theme: $npm$styledComponents$Theme },
  InputDefaultProps: {},
  OutputProps: $Diff<InputProps, { theme: $npm$styledComponents$Theme }>,
  OutputDefaultProps: InputDefaultProps & { theme: $npm$styledComponents$Theme },
>($npm$styledComponents$ReactComponentClass<InputProps, InputDefaultProps>) => $npm$styledComponents$ReactComponentClass<OutputProps, OutputDefaultProps>

type $npm$styledComponents$WithThemeReactComponentClassUndefinedDefaultProps = <
  InputProps: { theme: $npm$styledComponents$Theme },
  OutputProps: $Diff<InputProps, { theme: $npm$styledComponents$Theme }>,
>($npm$styledComponents$ReactComponentClassUndefinedDefaultProps<InputProps>) => $npm$styledComponents$ReactComponentClass<OutputProps, { theme: $npm$styledComponents$Theme }>

type $npm$styledComponents$WithThemeReactComponentFunctional = <
  InputProps: { theme: $npm$styledComponents$Theme },
  InputDefaultProps: {},
  OutputProps: $Diff<InputProps, { theme: $npm$styledComponents$Theme }>,
  OutputDefaultProps: InputDefaultProps & { theme: $npm$styledComponents$Theme },
>($npm$styledComponents$ReactComponentFunctional<InputProps, InputDefaultProps>) => $npm$styledComponents$ReactComponentFunctional<OutputProps, OutputDefaultProps>

type $npm$styledComponents$WithThemeReactComponentFunctionalUndefinedDefaultProps = <
  InputProps: { theme: $npm$styledComponents$Theme },
  OutputProps: $Diff<InputProps, { theme: $npm$styledComponents$Theme }>
>($npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<InputProps>) => $npm$styledComponents$ReactComponentFunctional<OutputProps, { theme: $npm$styledComponents$Theme }>

type $npm$styledComponents$WithTheme =
  & $npm$styledComponents$WithThemeReactComponentClass
  & $npm$styledComponents$WithThemeReactComponentClassUndefinedDefaultProps
  & $npm$styledComponents$WithThemeReactComponentFunctional
  & $npm$styledComponents$WithThemeReactComponentFunctionalUndefinedDefaultProps

// ---- MISC ----
type $npm$styledComponents$Theme = {[key: string]: mixed};
type $npm$styledComponents$ThemeProviderProps = {
  theme: $npm$styledComponents$Theme | ((outerTheme: $npm$styledComponents$Theme) => void)
};

class Npm$StyledComponents$ThemeProvider extends React$Component<$npm$styledComponents$ThemeProviderProps> {}

class Npm$StyledComponents$StyleSheetManager extends React$Component<{ sheet: mixed }> {}

class Npm$StyledComponents$ServerStyleSheet {
  instance: StyleSheet
  collectStyles: (children: any) => React$Node
  getStyleTags: () => string
  getStyleElement: () => React$Node
  interleaveWithNodeStream: (readableStream: stream$Readable) => stream$Readable
}

type $npm$styledComponents$StyledComponentsComponentListKeys =
  $Subtype<$Keys<$npm$styledComponents$StyledComponentsComponentList>>

type $npm$styledComponents$StyledComponentsComponentListValue =
  $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<{}, $npm$styledComponents$StyledComponentsComponentListKeys>

// ---- COMPONENT LIST ----
type $npm$styledComponents$StyledComponentsComponentList = {|
  a:                        $npm$styledComponents$StyledComponentsComponentListValue,
  abbr:                     $npm$styledComponents$StyledComponentsComponentListValue,
  address:                  $npm$styledComponents$StyledComponentsComponentListValue,
  area:                     $npm$styledComponents$StyledComponentsComponentListValue,
  article:                  $npm$styledComponents$StyledComponentsComponentListValue,
  aside:                    $npm$styledComponents$StyledComponentsComponentListValue,
  audio:                    $npm$styledComponents$StyledComponentsComponentListValue,
  b:                        $npm$styledComponents$StyledComponentsComponentListValue,
  base:                     $npm$styledComponents$StyledComponentsComponentListValue,
  bdi:                      $npm$styledComponents$StyledComponentsComponentListValue,
  bdo:                      $npm$styledComponents$StyledComponentsComponentListValue,
  big:                      $npm$styledComponents$StyledComponentsComponentListValue,
  blockquote:               $npm$styledComponents$StyledComponentsComponentListValue,
  body:                     $npm$styledComponents$StyledComponentsComponentListValue,
  br:                       $npm$styledComponents$StyledComponentsComponentListValue,
  button:                   $npm$styledComponents$StyledComponentsComponentListValue,
  canvas:                   $npm$styledComponents$StyledComponentsComponentListValue,
  caption:                  $npm$styledComponents$StyledComponentsComponentListValue,
  cite:                     $npm$styledComponents$StyledComponentsComponentListValue,
  code:                     $npm$styledComponents$StyledComponentsComponentListValue,
  col:                      $npm$styledComponents$StyledComponentsComponentListValue,
  colgroup:                 $npm$styledComponents$StyledComponentsComponentListValue,
  data:                     $npm$styledComponents$StyledComponentsComponentListValue,
  datalist:                 $npm$styledComponents$StyledComponentsComponentListValue,
  dd:                       $npm$styledComponents$StyledComponentsComponentListValue,
  del:                      $npm$styledComponents$StyledComponentsComponentListValue,
  details:                  $npm$styledComponents$StyledComponentsComponentListValue,
  dfn:                      $npm$styledComponents$StyledComponentsComponentListValue,
  dialog:                   $npm$styledComponents$StyledComponentsComponentListValue,
  div:                      $npm$styledComponents$StyledComponentsComponentListValue,
  dl:                       $npm$styledComponents$StyledComponentsComponentListValue,
  dt:                       $npm$styledComponents$StyledComponentsComponentListValue,
  em:                       $npm$styledComponents$StyledComponentsComponentListValue,
  embed:                    $npm$styledComponents$StyledComponentsComponentListValue,
  fieldset:                 $npm$styledComponents$StyledComponentsComponentListValue,
  figcaption:               $npm$styledComponents$StyledComponentsComponentListValue,
  figure:                   $npm$styledComponents$StyledComponentsComponentListValue,
  footer:                   $npm$styledComponents$StyledComponentsComponentListValue,
  form:                     $npm$styledComponents$StyledComponentsComponentListValue,
  h1:                       $npm$styledComponents$StyledComponentsComponentListValue,
  h2:                       $npm$styledComponents$StyledComponentsComponentListValue,
  h3:                       $npm$styledComponents$StyledComponentsComponentListValue,
  h4:                       $npm$styledComponents$StyledComponentsComponentListValue,
  h5:                       $npm$styledComponents$StyledComponentsComponentListValue,
  h6:                       $npm$styledComponents$StyledComponentsComponentListValue,
  head:                     $npm$styledComponents$StyledComponentsComponentListValue,
  header:                   $npm$styledComponents$StyledComponentsComponentListValue,
  hgroup:                   $npm$styledComponents$StyledComponentsComponentListValue,
  hr:                       $npm$styledComponents$StyledComponentsComponentListValue,
  html:                     $npm$styledComponents$StyledComponentsComponentListValue,
  i:                        $npm$styledComponents$StyledComponentsComponentListValue,
  iframe:                   $npm$styledComponents$StyledComponentsComponentListValue,
  img:                      $npm$styledComponents$StyledComponentsComponentListValue,
  input:                    $npm$styledComponents$StyledComponentsComponentListValue,
  ins:                      $npm$styledComponents$StyledComponentsComponentListValue,
  kbd:                      $npm$styledComponents$StyledComponentsComponentListValue,
  keygen:                   $npm$styledComponents$StyledComponentsComponentListValue,
  label:                    $npm$styledComponents$StyledComponentsComponentListValue,
  legend:                   $npm$styledComponents$StyledComponentsComponentListValue,
  li:                       $npm$styledComponents$StyledComponentsComponentListValue,
  link:                     $npm$styledComponents$StyledComponentsComponentListValue,
  main:                     $npm$styledComponents$StyledComponentsComponentListValue,
  map:                      $npm$styledComponents$StyledComponentsComponentListValue,
  mark:                     $npm$styledComponents$StyledComponentsComponentListValue,
  menu:                     $npm$styledComponents$StyledComponentsComponentListValue,
  menuitem:                 $npm$styledComponents$StyledComponentsComponentListValue,
  meta:                     $npm$styledComponents$StyledComponentsComponentListValue,
  meter:                    $npm$styledComponents$StyledComponentsComponentListValue,
  nav:                      $npm$styledComponents$StyledComponentsComponentListValue,
  noscript:                 $npm$styledComponents$StyledComponentsComponentListValue,
  object:                   $npm$styledComponents$StyledComponentsComponentListValue,
  ol:                       $npm$styledComponents$StyledComponentsComponentListValue,
  optgroup:                 $npm$styledComponents$StyledComponentsComponentListValue,
  option:                   $npm$styledComponents$StyledComponentsComponentListValue,
  output:                   $npm$styledComponents$StyledComponentsComponentListValue,
  p:                        $npm$styledComponents$StyledComponentsComponentListValue,
  param:                    $npm$styledComponents$StyledComponentsComponentListValue,
  picture:                  $npm$styledComponents$StyledComponentsComponentListValue,
  pre:                      $npm$styledComponents$StyledComponentsComponentListValue,
  progress:                 $npm$styledComponents$StyledComponentsComponentListValue,
  q:                        $npm$styledComponents$StyledComponentsComponentListValue,
  rp:                       $npm$styledComponents$StyledComponentsComponentListValue,
  rt:                       $npm$styledComponents$StyledComponentsComponentListValue,
  ruby:                     $npm$styledComponents$StyledComponentsComponentListValue,
  s:                        $npm$styledComponents$StyledComponentsComponentListValue,
  samp:                     $npm$styledComponents$StyledComponentsComponentListValue,
  script:                   $npm$styledComponents$StyledComponentsComponentListValue,
  section:                  $npm$styledComponents$StyledComponentsComponentListValue,
  select:                   $npm$styledComponents$StyledComponentsComponentListValue,
  small:                    $npm$styledComponents$StyledComponentsComponentListValue,
  source:                   $npm$styledComponents$StyledComponentsComponentListValue,
  span:                     $npm$styledComponents$StyledComponentsComponentListValue,
  strong:                   $npm$styledComponents$StyledComponentsComponentListValue,
  style:                    $npm$styledComponents$StyledComponentsComponentListValue,
  sub:                      $npm$styledComponents$StyledComponentsComponentListValue,
  summary:                  $npm$styledComponents$StyledComponentsComponentListValue,
  sup:                      $npm$styledComponents$StyledComponentsComponentListValue,
  table:                    $npm$styledComponents$StyledComponentsComponentListValue,
  tbody:                    $npm$styledComponents$StyledComponentsComponentListValue,
  td:                       $npm$styledComponents$StyledComponentsComponentListValue,
  textarea:                 $npm$styledComponents$StyledComponentsComponentListValue,
  tfoot:                    $npm$styledComponents$StyledComponentsComponentListValue,
  th:                       $npm$styledComponents$StyledComponentsComponentListValue,
  thead:                    $npm$styledComponents$StyledComponentsComponentListValue,
  time:                     $npm$styledComponents$StyledComponentsComponentListValue,
  title:                    $npm$styledComponents$StyledComponentsComponentListValue,
  tr:                       $npm$styledComponents$StyledComponentsComponentListValue,
  track:                    $npm$styledComponents$StyledComponentsComponentListValue,
  u:                        $npm$styledComponents$StyledComponentsComponentListValue,
  ul:                       $npm$styledComponents$StyledComponentsComponentListValue,
  var:                      $npm$styledComponents$StyledComponentsComponentListValue,
  video:                    $npm$styledComponents$StyledComponentsComponentListValue,
  wbr:                      $npm$styledComponents$StyledComponentsComponentListValue,

  // SVG
  circle:                   $npm$styledComponents$StyledComponentsComponentListValue,
  clipPath:                 $npm$styledComponents$StyledComponentsComponentListValue,
  defs:                     $npm$styledComponents$StyledComponentsComponentListValue,
  ellipse:                  $npm$styledComponents$StyledComponentsComponentListValue,
  g:                        $npm$styledComponents$StyledComponentsComponentListValue,
  image:                    $npm$styledComponents$StyledComponentsComponentListValue,
  line:                     $npm$styledComponents$StyledComponentsComponentListValue,
  linearGradient:           $npm$styledComponents$StyledComponentsComponentListValue,
  mask:                     $npm$styledComponents$StyledComponentsComponentListValue,
  path:                     $npm$styledComponents$StyledComponentsComponentListValue,
  pattern:                  $npm$styledComponents$StyledComponentsComponentListValue,
  polygon:                  $npm$styledComponents$StyledComponentsComponentListValue,
  polyline:                 $npm$styledComponents$StyledComponentsComponentListValue,
  radialGradient:           $npm$styledComponents$StyledComponentsComponentListValue,
  rect:                     $npm$styledComponents$StyledComponentsComponentListValue,
  stop:                     $npm$styledComponents$StyledComponentsComponentListValue,
  svg:                      $npm$styledComponents$StyledComponentsComponentListValue,
  text:                     $npm$styledComponents$StyledComponentsComponentListValue,
  tspan:                    $npm$styledComponents$StyledComponentsComponentListValue,
|}

type $npm$styledComponents$StyledComponentsNativeComponentListKeys =
  $Subtype<$Keys<$npm$styledComponents$StyledComponentsNativeComponentList>>

type $npm$styledComponents$StyledComponentsNativeComponentListValue =
  $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<{}, $npm$styledComponents$StyledComponentsNativeComponentListKeys>

type $npm$styledComponents$StyledComponentsNativeComponentList = {|
  ActivityIndicator:            $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ActivityIndicatorIOS:         $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ART:                          $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Button:                       $npm$styledComponents$StyledComponentsNativeComponentListValue,
  DatePickerIOS:                $npm$styledComponents$StyledComponentsNativeComponentListValue,
  DrawerLayoutAndroid:          $npm$styledComponents$StyledComponentsNativeComponentListValue,
  FlatList:                     $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Image:                        $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ImageEditor:                  $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ImageStore:                   $npm$styledComponents$StyledComponentsNativeComponentListValue,
  KeyboardAvoidingView:         $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ListView:                     $npm$styledComponents$StyledComponentsNativeComponentListValue,
  MapView:                      $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Modal:                        $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Navigator:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  NavigatorIOS:                 $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Picker:                       $npm$styledComponents$StyledComponentsNativeComponentListValue,
  PickerIOS:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ProgressBarAndroid:           $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ProgressViewIOS:              $npm$styledComponents$StyledComponentsNativeComponentListValue,
  RecyclerViewBackedScrollView: $npm$styledComponents$StyledComponentsNativeComponentListValue,
  RefreshControl:               $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ScrollView:                   $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SectionList:                  $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SegmentedControlIOS:          $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Slider:                       $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SliderIOS:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SnapshotViewIOS:              $npm$styledComponents$StyledComponentsNativeComponentListValue,
  StatusBar:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SwipeableListView:            $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Switch:                       $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SwitchAndroid:                $npm$styledComponents$StyledComponentsNativeComponentListValue,
  SwitchIOS:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TabBarIOS:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Text:                         $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TextInput:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ToastAndroid:                 $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ToolbarAndroid:               $npm$styledComponents$StyledComponentsNativeComponentListValue,
  Touchable:                    $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TouchableHighlight:           $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TouchableNativeFeedback:      $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TouchableOpacity:             $npm$styledComponents$StyledComponentsNativeComponentListValue,
  TouchableWithoutFeedback:     $npm$styledComponents$StyledComponentsNativeComponentListValue,
  View:                         $npm$styledComponents$StyledComponentsNativeComponentListValue,
  ViewPagerAndroid:             $npm$styledComponents$StyledComponentsNativeComponentListValue,
  VirtualizedList:              $npm$styledComponents$StyledComponentsNativeComponentListValue,
  WebView:                      $npm$styledComponents$StyledComponentsNativeComponentListValue,
|}

declare module 'styled-components' {
  declare type Interpolation                                              = $npm$styledComponents$Interpolation;
  declare type NameGenerator                                              = $npm$styledComponents$NameGenerator;
  declare type Theme                                                      = $npm$styledComponents$Theme;
  declare type ThemeProviderProps                                         = $npm$styledComponents$ThemeProviderProps;
  declare type TaggedTemplateLiteral<R>                                   = $npm$styledComponents$TaggedTemplateLiteral<R>;
  declare type ComponentListKeys                                          = $npm$styledComponents$StyledComponentsComponentListKeys;

  declare type ReactComponentFunctional<Props: {}, DefaultProps: ?{} = *> = $npm$styledComponents$ReactComponentFunctional<Props, DefaultProps>;
  declare type ReactComponentFunctionalUndefinedDefaultProps<Props: {}>   = $npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<Props>;
  declare type ReactComponentClass<Props: {}, DefaultProps: ?{} = *>      = $npm$styledComponents$ReactComponentClass<Props, DefaultProps>;
  declare type ReactComponentClassUndefinedDefaultProps<Props: {}>        = $npm$styledComponents$ReactComponentClassUndefinedDefaultProps<Props>;
  declare type ReactComponentUnion<Props>                                 = $npm$styledComponents$ReactComponentUnion<Props>;
  declare type ReactComponentIntersection<Props>                          = $npm$styledComponents$ReactComponentIntersection<Props>;
  declare type ReactComponentStyledStaticProps<Props>                     = $npm$styledComponents$ReactComponentStyledStaticPropsWithComponent<Props, ComponentListKeys>;
  declare type ReactComponentStyled<Props>                                = $npm$styledComponents$ReactComponentStyled<Props, ComponentListKeys>;
  declare type ReactComponentStyledTaggedTemplateLiteral<Props>           = $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<Props, ComponentListKeys>;

  declare module.exports: {
    $call: $npm$styledComponents$Call<ComponentListKeys>,

    injectGlobal: TaggedTemplateLiteral<void>,
    css: TaggedTemplateLiteral<Array<Interpolation>>,
    keyframes: TaggedTemplateLiteral<string>,
    withTheme: $npm$styledComponents$WithTheme,
    ServerStyleSheet: typeof Npm$StyledComponents$ServerStyleSheet,
    StyleSheetManager: typeof Npm$StyledComponents$StyleSheetManager,
    ThemeProvider: typeof Npm$StyledComponents$ThemeProvider,

    ...$npm$styledComponents$StyledComponentsComponentList,
    ...$npm$styledComponents$StyledComponentsNativeComponentList,
  };
}

declare module 'styled-components/native' {
  declare type Interpolation                                              = $npm$styledComponents$Interpolation;
  declare type NameGenerator                                              = $npm$styledComponents$NameGenerator;
  declare type Theme                                                      = $npm$styledComponents$Theme;
  declare type ThemeProviderProps                                         = $npm$styledComponents$ThemeProviderProps;
  declare type TaggedTemplateLiteral<R>                                   = $npm$styledComponents$TaggedTemplateLiteral<R>;
  declare type NativeComponentListKeys                                    = $npm$styledComponents$StyledComponentsNativeComponentListKeys;

  declare type ReactComponentFunctional<Props: {}, DefaultProps: ?{} = *> = $npm$styledComponents$ReactComponentFunctional<Props, DefaultProps>;
  declare type ReactComponentFunctionalUndefinedDefaultProps<Props: {}>   = $npm$styledComponents$ReactComponentFunctionalUndefinedDefaultProps<Props>;
  declare type ReactComponentClass<Props: {}, DefaultProps: ?{} = *>      = $npm$styledComponents$ReactComponentClass<Props, DefaultProps>;
  declare type ReactComponentClassUndefinedDefaultProps<Props: {}>        = $npm$styledComponents$ReactComponentClassUndefinedDefaultProps<Props>;
  declare type ReactComponentUnion<Props>                                 = $npm$styledComponents$ReactComponentUnion<Props>;
  declare type ReactComponentIntersection<Props>                          = $npm$styledComponents$ReactComponentIntersection<Props>;
  declare type ReactComponentStyledStaticProps<Props>                     = $npm$styledComponents$ReactComponentStyledStaticPropsWithComponent<Props, NativeComponentListKeys>;
  declare type ReactComponentStyled<Props>                                = $npm$styledComponents$ReactComponentStyled<Props, NativeComponentListKeys>;
  declare type ReactComponentStyledTaggedTemplateLiteral<Props>           = $npm$styledComponents$ReactComponentStyledTaggedTemplateLiteralWithComponent<Props, NativeComponentListKeys>;

  declare module.exports: {
    $call: $npm$styledComponents$Call<NativeComponentListKeys>,

    css: TaggedTemplateLiteral<Array<Interpolation>>,
    keyframes: TaggedTemplateLiteral<string>,
    withTheme: $npm$styledComponents$WithTheme,
    ThemeProvider: typeof Npm$StyledComponents$ThemeProvider,

    ...$npm$styledComponents$StyledComponentsNativeComponentList,
  };
}
