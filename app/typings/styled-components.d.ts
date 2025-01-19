// import original module declarations
import "styled-components";

// and extend them!
declare module "styled-components" {
  interface EditorTheme {
    isDark: boolean;
    background: string;
    text: string;
    cursor: string;
    divider: string;
    tableSelected: string;
    tableSelectedBackground: string;
    quote: string;
    codeBackground: string;
    codeBorder: string;
    horizontalRule: string;
    scrollbarBackground: string;
    scrollbarThumb: string;
    fontFamily: string;
    fontFamilyMono: string;
    fontFamilyEmoji: string;
    fontWeightRegular: number;
    fontWeightMedium: number;
    fontWeightBold: number;
    link: string;
    placeholder: string;
    textSecondary: string;
    textHighlight: string;
    textHighlightForeground: string;
    selected: string;
    code: string;
    codeComment: string;
    codePunctuation: string;
    codeNumber: string;
    codeProperty: string;
    codeTag: string;
    codeString: string;
    codeClassName: string;
    codeSelector: string;
    codeAttr: string;
    codeEntity: string;
    codeKeyword: string;
    codeFunction: string;
    codeStatement: string;
    codePlaceholder: string;
    codeInserted: string;
    codeImportant: string;
    noticeInfoBackground: string;
    noticeInfoText: string;
    noticeTipBackground: string;
    noticeTipText: string;
    noticeWarningBackground: string;
    noticeWarningText: string;
    noticeSuccessBackground: string;
    noticeSuccessText: string;
  }

  interface Colors {
    transparent: string;
    almostBlack: string;
    lightBlack: string;
    almostWhite: string;
    veryDarkBlue: string;
    slate: string;
    slateLight: string;
    slateDark: string;
    smoke: string;
    smokeLight: string;
    smokeDark: string;
    white: string;
    white05: string;
    white10: string;
    white50: string;
    white75: string;
    black: string;
    black05: string;
    black10: string;
    black50: string;
    black75: string;
    accent: string;
    yellow: string;
    warmGrey: string;
    danger: string;
    warning: string;
    success: string;
    info: string;
    brand: {
      red: string;
      pink: string;
      purple: string;
      blue: string;
      marine: string;
      dusk: string;
      green: string;
      yellow: string;
    };
  }

  interface Breakpoints {
    breakpoints: {
      mobile: number;
      mobileLarge: number;
      tablet: number;
      desktop: number;
      desktopLarge: number;
    };
  }

  interface Spacing {
    sidebarWidth: number;
    sidebarRightWidth: number;
    sidebarCollapsedWidth: number;
    sidebarMinWidth: number;
    sidebarMaxWidth: number;
  }

  export interface DefaultTheme
    extends Colors,
      Spacing,
      Breakpoints,
      EditorTheme {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    backgroundQuaternary: string;
    accent: string;
    accentText: string;
    link: string;
    text: string;
    cursor: string;
    textSecondary: string;
    textTertiary: string;
    textDiffInserted: string;
    textDiffInsertedBackground: string;
    textDiffDeleted: string;
    textDiffDeletedBackground: string;
    placeholder: string;
    commentMarkBackground: string;
    sidebarBackground: string;
    sidebarActiveBackground: string;
    sidebarControlHoverBackground: string;
    sidebarDraftBorder: string;
    sidebarText: string;
    backdrop: string;
    shadow: string;
    modalBackdrop: string;
    modalBackground: string;
    modalShadow: string;
    menuItemSelected: string;
    menuBackground: string;
    menuShadow: string;
    menuBorder?: string;
    divider: string;
    titleBarDivider: string;
    inputBorder: string;
    inputBorderFocused: string;
    listItemHoverBackground: string;
    mentionBackground: string;
    mentionHoverBackground: string;
    buttonNeutralBackground: string;
    buttonNeutralText: string;
    buttonNeutralBorder: string;
    tooltipBackground: string;
    tooltipText: string;
    toastBackground: string;
    toastText: string;
    quote: string;
    codeBackground: string;
    codeBorder: string;
    embedBorder: string;
    horizontalRule: string;
    progressBarBackground: string;
    scrollbarBackground: string;
    scrollbarThumb: string;
  }
}
