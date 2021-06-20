// @flow
import { darken, lighten } from "polished";

const colors = {
  transparent: "transparent",
  almostBlack: "#111319",
  lightBlack: "#2F3336",
  almostWhite: "#E6E6E6",
  veryDarkBlue: "#08090C",

  slate: "#9BA6B2",
  slateLight: "#DAE1E9",
  slateDark: "#4E5C6E",

  smoke: "#F4F7FA",
  smokeLight: "#F9FBFC",
  smokeDark: "#E8EBED",

  white: "#FFF",
  white10: "rgba(255, 255, 255, 0.1)",
  white50: "rgba(255, 255, 255, 0.5)",
  black: "#000",
  black05: "rgba(0, 0, 0, 0.05)",
  black10: "rgba(0, 0, 0, 0.1)",
  black50: "rgba(0, 0, 0, 0.50)",
  primary: "#0366d6",
  yellow: "#FBCA04",
  warmGrey: "#EDF2F7",

  searchHighlight: "#FDEA9B",
  danger: "#ff476f",
  warning: "#f08a24",
  success: "#2f3336",
  info: "#a0d3e8",

  brand: {
    red: "#FF5C80",
    pink: "#FF4DFA",
    purple: "#9E5CF7",
    blue: "#3633FF",
    marine: "#2BC2FF",
    green: "#42DED1",
  },
};

const spacing = {
  padding: "1.5vw 1.875vw",
  vpadding: "1.5vw",
  hpadding: "1.875vw",
  sidebarWidth: 260,
  sidebarCollapsedWidth: 16,
  sidebarMinWidth: 200,
  sidebarMaxWidth: 400,
};

export const base = {
  ...colors,
  ...spacing,
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen, Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif",
  fontFamilyMono:
    "'SFMono-Regular',Consolas,'Liberation Mono', Menlo, Courier,monospace",
  fontWeight: 400,
  backgroundTransition: "background 100ms ease-in-out",
  zIndex: 100,

  selected: colors.primary,
  buttonBackground: colors.primary,
  buttonText: colors.white,
  textHighlight: "#FDEA9B",
  textHighlightForeground: colors.almostBlack,

  codeComment: "#6a737d",
  codePunctuation: "#5e6687",
  codeNumber: "#d73a49",
  codeProperty: "#c08b30",
  codeTag: "#3d8fd1",
  codeString: "#032f62",
  codeSelector: "#6679cc",
  codeAttr: "#c76b29",
  codeEntity: "#22a2c9",
  codeKeyword: "#d73a49",
  codeFunction: "#6f42c1",
  codeStatement: "#22a2c9",
  codePlaceholder: "#3d8fd1",
  codeInserted: "#202746",
  codeImportant: "#c94922",

  blockToolbarBackground: colors.white,
  blockToolbarTrigger: colors.slate,
  blockToolbarTriggerIcon: colors.white,
  blockToolbarItem: colors.almostBlack,
  blockToolbarText: colors.almostBlack,
  blockToolbarTextSelected: colors.black,
  blockToolbarHoverBackground: colors.slateLight,
  blockToolbarDivider: colors.slateLight,
  blockToolbarIcon: undefined,
  blockToolbarIconSelected: colors.black,

  noticeTipBackground: colors.brand.purple,
  noticeTipText: colors.white,
  noticeWarningBackground: colors.danger,
  noticeWarningText: colors.white,

  breakpoints: {
    mobile: 0, // targeting all devices
    tablet: 737, // targeting devices that are larger than the iPhone 6 Plus (which is 736px in landscape mode)
    desktop: 1025, // targeting devices that are larger than the iPad (which is 1024px in landscape mode)
    desktopLarge: 1600,
  },

  depths: {
    header: 800,
    sidebar: 900,
    hoverPreview: 998,
    // Note: editor lightbox is z-index 999
    modalOverlay: 2000,
    modal: 3000,
    menu: 4000,
    toasts: 5000,
    loadingIndicatorBar: 6000,
    popover: 9000,
    titleBarDivider: 10000,
  },
};

export const light = {
  ...base,
  background: colors.white,
  secondaryBackground: colors.warmGrey,

  link: colors.primary,
  text: colors.almostBlack,
  cursor: colors.almostBlack,
  textSecondary: colors.slateDark,
  textTertiary: colors.slate,
  placeholder: "#a2b2c3",

  sidebarBackground: colors.warmGrey,
  sidebarItemBackground: colors.black10,
  sidebarText: "rgb(78, 92, 110)",
  backdrop: "rgba(0, 0, 0, 0.2)",
  shadow: "rgba(0, 0, 0, 0.2)",

  menuBackground: colors.white,
  menuShadow:
    "0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.08), 0 30px 40px rgb(0 0 0 / 8%)",
  divider: colors.slateLight,
  titleBarDivider: colors.slateLight,
  inputBorder: colors.slateLight,
  inputBorderFocused: colors.slate,

  listItemHoverBackground: colors.warmGrey,

  toolbarHoverBackground: colors.black,
  toolbarBackground: colors.lightBlack,
  toolbarInput: colors.white10,
  toolbarItem: colors.white,

  tableDivider: colors.smokeDark,
  tableSelected: colors.primary,
  tableSelectedBackground: "#E5F7FF",

  buttonNeutralBackground: colors.white,
  buttonNeutralText: colors.almostBlack,
  buttonNeutralBorder: darken(0.15, colors.white),

  tooltipBackground: colors.almostBlack,
  tooltipText: colors.white,

  toastBackground: colors.almostBlack,
  toastText: colors.white,

  quote: colors.slateLight,
  codeBackground: colors.smoke,
  codeBorder: colors.smokeDark,
  embedBorder: colors.slateLight,
  horizontalRule: colors.smokeDark,

  noticeInfoBackground: colors.warmGrey,
  noticeInfoText: colors.almostBlack,

  scrollbarBackground: colors.smoke,
  scrollbarThumb: darken(0.15, colors.smokeDark),
};

export const dark = {
  ...base,
  background: colors.almostBlack,
  secondaryBackground: colors.black50,

  link: "#137FFB",
  text: colors.almostWhite,
  cursor: colors.almostWhite,
  textSecondary: lighten(0.1, colors.slate),
  textTertiary: colors.slate,
  placeholder: colors.slateDark,

  sidebarBackground: colors.veryDarkBlue,
  sidebarItemBackground: colors.transparent,
  sidebarText: colors.slate,
  backdrop: "rgba(255, 255, 255, 0.3)",
  shadow: "rgba(0, 0, 0, 0.6)",

  menuBorder: lighten(0.1, colors.almostBlack),
  menuBackground: lighten(0.015, colors.almostBlack),
  menuShadow:
    "0 0 0 1px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 0 1px rgba(255,255,255,.2)",
  divider: lighten(0.1, colors.almostBlack),
  titleBarDivider: darken(0.4, colors.slate),
  inputBorder: colors.slateDark,
  inputBorderFocused: colors.slate,

  listItemHoverBackground: colors.black50,

  toolbarHoverBackground: colors.slate,
  toolbarBackground: colors.white,
  toolbarInput: colors.black10,
  toolbarItem: colors.lightBlack,

  tableDivider: colors.lightBlack,
  tableSelected: colors.primary,
  tableSelectedBackground: "#002333",

  buttonNeutralBackground: colors.almostBlack,
  buttonNeutralText: colors.white,
  buttonNeutralBorder: colors.slateDark,

  tooltipBackground: colors.white,
  tooltipText: colors.lightBlack,

  toastBackground: colors.white,
  toastText: colors.lightBlack,

  quote: colors.almostWhite,
  codeBackground: colors.black,
  codeBorder: colors.black50,
  codeString: "#3d8fd1",
  embedBorder: colors.black50,
  horizontalRule: lighten(0.1, colors.almostBlack),

  noticeInfoBackground: colors.white10,
  noticeInfoText: colors.almostWhite,

  scrollbarBackground: colors.black,
  scrollbarThumb: colors.lightBlack,
};

export const lightMobile = {
  background: colors.white,
};

export const darkMobile = {
  background: colors.black,
};

export default light;
