// @flow
const colors = {
  almostBlack: '#181A1B',
  lightBlack: '#2F3336',
  almostWhite: '#E6E6E6',

  slate: '#9BA6B2',
  slateLight: '#DAE1E9',
  slateDark: '#4E5C6E',

  white: '#FFF',
  white10: 'rgba(255, 255, 255, 0.1)',
  black: '#000',
  black10: 'rgba(0, 0, 0, 0.1)',
  primary: '#1AB6FF',
  greyLight: '#F4F7FA',
  grey: '#E8EBED',
  greyMid: '#9BA6B2',
  greyDark: '#DAE1E9',

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
  link: colors.primary,
  placeholder: '#B1BECC',
  textSecondary: colors.slate,
  textLight: colors.white,
  selected: colors.primary,
  inputBorder: colors.slate,

  contentHeaderBackground: 'hsl(180, 58%, 85%)',
};

export const light = {
  ...base,
  background: colors.white,
  text: colors.almostBlack,

  sidebarBackground: 'rgb(244, 247, 250)',
  sidebarText: 'rgb(78, 92, 110)',

  menuBackground: colors.white,
  divider: colors.slateLight,

  toolbarBackground: colors.lightBlack,
  toolbarInput: colors.white10,
  toolbarItem: colors.white,

  blockToolbarBackground: colors.greyLight,
  blockToolbarTrigger: colors.greyMid,
  blockToolbarTriggerIcon: colors.white,
  blockToolbarItem: colors.almostBlack,

  quote: colors.greyDark,
  codeBackground: colors.greyLight,
  codeBorder: colors.grey,
  horizontalRule: colors.grey,
};

export const dark = {
  ...base,
  background: colors.almostBlack,
  text: colors.almostWhite,

  sidebarBackground: 'rgba(0, 0, 0, 0.5)',
  sidebarText: colors.greyMid,

  menuBackground: colors.almostBlack,
  divider: colors.lightBlack,

  toolbarBackground: colors.white,
  toolbarInput: colors.black10,
  toolbarItem: colors.lightBlack,

  blockToolbarBackground: colors.white,
  blockToolbarTrigger: colors.almostWhite,
  blockToolbarTriggerIcon: colors.almostBlack,
  blockToolbarItem: colors.lightBlack,

  quote: colors.almostWhite,
  horizontalRule: colors.almostWhite,
};

export default light;
