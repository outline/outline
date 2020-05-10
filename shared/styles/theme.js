// @flow
import { darken, lighten } from 'polished';

const colors = {
  almostBlack: '#111319',
  lightBlack: '#2F3336',
  almostWhite: '#E6E6E6',
  veryDarkBlue: '#08090C',

  slate: '#9BA6B2',
  slateLight: '#DAE1E9',
  slateDark: '#4E5C6E',

  smoke: '#F4F7FA',
  smokeLight: '#F9FBFC',
  smokeDark: '#E8EBED',

  white: '#FFF',
  white10: 'rgba(255, 255, 255, 0.1)',
  white50: 'rgba(255, 255, 255, 0.5)',
  black: '#000',
  black05: 'rgba(0, 0, 0, 0.05)',
  black10: 'rgba(0, 0, 0, 0.1)',
  black50: 'rgba(0, 0, 0, 0.50)',
  primary: '#0366d6',
  yellow: '#FBCA04',
  warmGrey: '#EDF2F7',

  danger: '#D0021B',
  warning: '#f08a24',
  success: '#2f3336',
  info: '#a0d3e8',
};

const spacing = {
  padding: '1.5vw 1.875vw',
  vpadding: '1.5vw',
  hpadding: '1.875vw',
  sidebarWidth: '280px',
  sidebarMinWidth: '250px',
  sidebarMaxWidth: '350px',
};

export const base = {
  ...colors,
  ...spacing,
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen, Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif",
  fontWeight: 400,
  backgroundTransition: 'background 100ms ease-in-out',
  zIndex: 100,

  selected: colors.primary,
  buttonBackground: colors.primary,
  buttonText: colors.white,

  breakpoints: {
    mobile: 0, // targeting all devices
    tablet: 737, // targeting devices that are larger than the iPhone 6 Plus (which is 736px in landscape mode)
    desktop: 1025, // targeting devices that are larger than the iPad (which is 1024px in landscape mode)
    desktopLarge: 1600,
  },
};

export const light = {
  ...base,
  background: colors.white,
  secondaryBackground: colors.warmGrey,

  link: colors.almostBlack,
  text: colors.almostBlack,
  textSecondary: colors.slateDark,
  textTertiary: colors.slate,
  placeholder: '#B1BECC',

  sidebarBackground: colors.warmGrey,
  sidebarItemBackground: colors.black05,
  sidebarText: 'rgb(78, 92, 110)',
  shadow: 'rgba(0, 0, 0, 0.2)',

  menuBackground: colors.white,
  menuShadow:
    '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.08)',
  divider: colors.slateLight,
  inputBorder: colors.slateLight,
  inputBorderFocused: colors.slate,

  listItemHoverBackground: colors.warmGrey,

  toolbarBackground: colors.lightBlack,
  toolbarInput: colors.white10,
  toolbarItem: colors.white,

  tableDivider: colors.smokeDark,
  tableSelected: colors.primary,
  tableSelectedBackground: '#E5F7FF',

  buttonNeutralBackground: colors.white,
  buttonNeutralText: colors.almostBlack,
  buttonNeutralBorder: darken(0.15, colors.white),

  tooltipBackground: colors.almostBlack,
  tooltipText: colors.white,

  blockToolbarBackground: colors.smoke,
  blockToolbarTrigger: colors.slate,
  blockToolbarTriggerIcon: colors.white,
  blockToolbarItem: colors.almostBlack,

  quote: colors.slateLight,
  codeBackground: colors.smoke,
  codeBorder: colors.smokeDark,
  embedBorder: '#DDD #DDD #CCC',
  horizontalRule: colors.smokeDark,
};

export const dark = {
  ...base,
  background: colors.almostBlack,
  secondaryBackground: colors.black50,

  link: colors.almostWhite,
  text: colors.almostWhite,
  textSecondary: lighten(0.2, colors.slate),
  textTertiary: colors.slate,
  placeholder: darken(0.5, '#B1BECC'),

  sidebarBackground: colors.veryDarkBlue,
  sidebarItemBackground: colors.veryDarkBlue,
  sidebarText: colors.slate,
  shadow: 'rgba(0, 0, 0, 0.6)',

  menuBackground: lighten(0.015, colors.almostBlack),
  menuShadow:
    '0 0 0 1px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.08), inset 0 0 1px rgba(255,255,255,.2)',
  divider: darken(0.2, colors.slate),
  inputBorder: colors.slateDark,
  inputBorderFocused: colors.slate,

  listItemHoverBackground: colors.black50,

  toolbarBackground: colors.white,
  toolbarInput: colors.black10,
  toolbarItem: colors.lightBlack,

  tableDivider: colors.lightBlack,
  tableSelected: colors.primary,
  tableSelectedBackground: '#002333',

  buttonNeutralBackground: colors.almostBlack,
  buttonNeutralText: colors.white,
  buttonNeutralBorder: colors.slateDark,

  tooltipBackground: colors.white,
  tooltipText: colors.lightBlack,

  blockToolbarBackground: colors.white,
  blockToolbarTrigger: colors.almostWhite,
  blockToolbarTriggerIcon: colors.almostBlack,
  blockToolbarItem: colors.lightBlack,

  quote: colors.almostWhite,
  codeBackground: colors.almostBlack,
  codeBorder: colors.black50,
  embedBorder: colors.black50,
  horizontalRule: darken(0.2, colors.slate),
};

export default light;
