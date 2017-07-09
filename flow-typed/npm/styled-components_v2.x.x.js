// flow-typed signature: 13dd8d47f3937f64fe9cd3ec4aa79e55
// flow-typed version: d04eb04853/styled-components_v2.x.x/flow_>=v0.25.x

// @flow

type $npm$styledComponents$Interpolation = ((executionContext: Object) => string) | string | number;
type $npm$styledComponents$NameGenerator = (hash: number) => string

type $npm$styledComponents$StyledComponent = (
  strings: Array<string>,
  ...interpolations: Array<$npm$styledComponents$Interpolation>
) => ReactClass<*>;


type $npm$styledComponents$Theme = {[key: string]: mixed};
type $npm$styledComponents$ThemeProviderProps = {
  theme: $npm$styledComponents$Theme | ((outerTheme: $npm$styledComponents$Theme) => void)
};
type $npm$styledComponents$Component =
  | ReactClass<*>
  | (props: *) => React$Element<*>;

class Npm$StyledComponents$ThemeProvider extends React$Component {
  props: $npm$styledComponents$ThemeProviderProps;
}

type $npm$styledComponents$StyleSheetManagerProps = {
  sheet: mixed
}

class Npm$StyledComponents$StyleSheetManager extends React$Component {
  props: $npm$styledComponents$StyleSheetManagerProps;
}

class Npm$StyledComponents$ServerStyleSheet {
  instance: StyleSheet
  collectStyles: (children: any) => React$Element<*>
  getStyleTags: () => string
  getStyleElement: () => React$Element<*>
}

declare module 'styled-components' {
  declare type Interpolation = $npm$styledComponents$Interpolation;
  declare type NameGenerator = $npm$styledComponents$NameGenerator;

  declare type StyledComponent = $npm$styledComponents$StyledComponent;

  declare type Theme = $npm$styledComponents$Theme;
  declare type ThemeProviderProps = $npm$styledComponents$ThemeProviderProps;
  declare type Component = $npm$styledComponents$Component;

  declare module.exports: {
    injectGlobal: (strings: Array<string>, ...interpolations: Array<Interpolation>) => void,
    css: (strings: Array<string>, ...interpolations: Array<Interpolation>) => Array<Interpolation>,
    keyframes: (strings: Array<string>, ...interpolations: Array<Interpolation>) => string,
    withTheme: (component: Component) => ReactClass<*>,
    ServerStyleSheet: typeof Npm$StyledComponents$ServerStyleSheet,
    StyleSheetManager: typeof Npm$StyledComponents$StyleSheetManager,
    ThemeProvider: typeof Npm$StyledComponents$ThemeProvider,
    (baseComponent: Component): StyledComponent,
    a: StyledComponent,
    abbr: StyledComponent,
    address: StyledComponent,
    area: StyledComponent,
    article: StyledComponent,
    aside: StyledComponent,
    audio: StyledComponent,
    b: StyledComponent,
    base: StyledComponent,
    bdi: StyledComponent,
    bdo: StyledComponent,
    big: StyledComponent,
    blockquote: StyledComponent,
    body: StyledComponent,
    br: StyledComponent,
    button: StyledComponent,
    canvas: StyledComponent,
    caption: StyledComponent,
    cite: StyledComponent,
    code: StyledComponent,
    col: StyledComponent,
    colgroup: StyledComponent,
    data: StyledComponent,
    datalist: StyledComponent,
    dd: StyledComponent,
    del: StyledComponent,
    details: StyledComponent,
    dfn: StyledComponent,
    dialog: StyledComponent,
    div: StyledComponent,
    dl: StyledComponent,
    dt: StyledComponent,
    em: StyledComponent,
    embed: StyledComponent,
    fieldset: StyledComponent,
    figcaption: StyledComponent,
    figure: StyledComponent,
    footer: StyledComponent,
    form: StyledComponent,
    h1: StyledComponent,
    h2: StyledComponent,
    h3: StyledComponent,
    h4: StyledComponent,
    h5: StyledComponent,
    h6: StyledComponent,
    head: StyledComponent,
    header: StyledComponent,
    hgroup: StyledComponent,
    hr: StyledComponent,
    html: StyledComponent,
    i: StyledComponent,
    iframe: StyledComponent,
    img: StyledComponent,
    input: StyledComponent,
    ins: StyledComponent,
    kbd: StyledComponent,
    keygen: StyledComponent,
    label: StyledComponent,
    legend: StyledComponent,
    li: StyledComponent,
    link: StyledComponent,
    main: StyledComponent,
    map: StyledComponent,
    mark: StyledComponent,
    menu: StyledComponent,
    menuitem: StyledComponent,
    meta: StyledComponent,
    meter: StyledComponent,
    nav: StyledComponent,
    noscript: StyledComponent,
    object: StyledComponent,
    ol: StyledComponent,
    optgroup: StyledComponent,
    option: StyledComponent,
    output: StyledComponent,
    p: StyledComponent,
    param: StyledComponent,
    picture: StyledComponent,
    pre: StyledComponent,
    progress: StyledComponent,
    q: StyledComponent,
    rp: StyledComponent,
    rt: StyledComponent,
    ruby: StyledComponent,
    s: StyledComponent,
    samp: StyledComponent,
    script: StyledComponent,
    section: StyledComponent,
    select: StyledComponent,
    small: StyledComponent,
    source: StyledComponent,
    span: StyledComponent,
    strong: StyledComponent,
    style: StyledComponent,
    sub: StyledComponent,
    summary: StyledComponent,
    sup: StyledComponent,
    table: StyledComponent,
    tbody: StyledComponent,
    td: StyledComponent,
    textarea: StyledComponent,
    tfoot: StyledComponent,
    th: StyledComponent,
    thead: StyledComponent,
    time: StyledComponent,
    title: StyledComponent,
    tr: StyledComponent,
    track: StyledComponent,
    u: StyledComponent,
    ul: StyledComponent,
    var: StyledComponent,
    video: StyledComponent,
    wbr: StyledComponent,

    // SVG
    circle: StyledComponent,
    clipPath: StyledComponent,
    defs: StyledComponent,
    ellipse: StyledComponent,
    g: StyledComponent,
    image: StyledComponent,
    line: StyledComponent,
    linearGradient: StyledComponent,
    mask: StyledComponent,
    path: StyledComponent,
    pattern: StyledComponent,
    polygon: StyledComponent,
    polyline: StyledComponent,
    radialGradient: StyledComponent,
    rect: StyledComponent,
    stop: StyledComponent,
    svg: StyledComponent,
    text: StyledComponent,
    tspan: StyledComponent,
  };
}

declare module 'styled-components/native' {
  declare type Interpolation = $npm$styledComponents$Interpolation;
  declare type NameGenerator = $npm$styledComponents$NameGenerator;

  declare type StyledComponent = $npm$styledComponents$StyledComponent;

  declare type Theme = $npm$styledComponents$Theme;
  declare type ThemeProviderProps = $npm$styledComponents$ThemeProviderProps;
  declare type Component = $npm$styledComponents$Component;

  declare module.exports: {
    css: (strings: Array<string>, ...interpolations: Array<Interpolation>) => Array<Interpolation>,
    withTheme: (component: Component) => ReactClass<*>,
    keyframes: (strings: Array<string>, ...interpolations: Array<Interpolation>) => string,
    ThemeProvider: typeof Npm$StyledComponents$ThemeProvider,

    (baseComponent: Component): StyledComponent,

    ActivityIndicator: StyledComponent,
    ActivityIndicatorIOS: StyledComponent,
    ART: StyledComponent,
    Button: StyledComponent,
    DatePickerIOS: StyledComponent,
    DrawerLayoutAndroid: StyledComponent,
    FlatList: StyledComponent,
    Image: StyledComponent,
    ImageEditor: StyledComponent,
    ImageStore: StyledComponent,
    KeyboardAvoidingView: StyledComponent,
    ListView: StyledComponent,
    MapView: StyledComponent,
    Modal: StyledComponent,
    Navigator: StyledComponent,
    NavigatorIOS: StyledComponent,
    Picker: StyledComponent,
    PickerIOS: StyledComponent,
    ProgressBarAndroid: StyledComponent,
    ProgressViewIOS: StyledComponent,
    RecyclerViewBackedScrollView: StyledComponent,
    RefreshControl: StyledComponent,
    ScrollView: StyledComponent,
    SectionList: StyledComponent,
    SegmentedControlIOS: StyledComponent,
    Slider: StyledComponent,
    SliderIOS: StyledComponent,
    SnapshotViewIOS: StyledComponent,
    StatusBar: StyledComponent,
    SwipeableListView: StyledComponent,
    Switch: StyledComponent,
    SwitchAndroid: StyledComponent,
    SwitchIOS: StyledComponent,
    TabBarIOS: StyledComponent,
    Text: StyledComponent,
    TextInput: StyledComponent,
    ToastAndroid: StyledComponent,
    ToolbarAndroid: StyledComponent,
    Touchable: StyledComponent,
    TouchableHighlight: StyledComponent,
    TouchableNativeFeedback: StyledComponent,
    TouchableOpacity: StyledComponent,
    TouchableWithoutFeedback: StyledComponent,
    View: StyledComponent,
    ViewPagerAndroid: StyledComponent,
    VirtualizedList: StyledComponent,
    WebView: StyledComponent,
  };
}
