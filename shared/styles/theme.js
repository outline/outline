// @flow
const colors = {
  almostBlack: '#181A1B',
  lightBlack: '#2F3336',
  almostWhite: '#E6E6E6',

  slate: '#9BA6B2',
  slateLight: '#DAE1E9',
  slateDark: '#4E5C6E',

  smoke: '#F4F7FA',
  smokeLight: '#F9FBFC',
  smokeDark: '#E8EBED',

  white: '#FFF',
  white10: 'rgba(255, 255, 255, 0.1)',
  black: '#000',
  black05: 'rgba(0, 0, 0, 0.05)',
  black10: 'rgba(0, 0, 0, 0.1)',
  black50: 'rgba(0, 0, 0, 0.50)',
  primary: '#1AB6FF',

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
  inputBorder: colors.slateLight,

  listItemHoverBackground: colors.smoke,
  listItemHoverBorder: colors.smokeDark,

  toolbarBackground: colors.lightBlack,
  toolbarInput: colors.white10,
  toolbarItem: colors.white,

  blockToolbarBackground: colors.smoke,
  blockToolbarTrigger: colors.slate,
  blockToolbarTriggerIcon: colors.white,
  blockToolbarItem: colors.almostBlack,

  quote: colors.slateLight,
  codeBackground: colors.smoke,
  codeBorder: colors.smokeDark,
  horizontalRule: colors.smokeDark,
};

export const dark = {
  ...base,
  background: colors.almostBlack,
  text: colors.almostWhite,

  sidebarBackground: colors.black50,
  sidebarText: colors.slate,

  menuBackground: colors.almostBlack,
  divider: colors.lightBlack,
  inputBorder: colors.slate,

  listItemHoverBackground: colors.black10,
  listItemHoverBorder: colors.black50,

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
