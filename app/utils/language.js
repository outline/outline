// @flow

export function detectLanguage() {
  const [ln, r] = navigator.language.split("-");
  const region = (r || ln).toUpperCase();
  return `${ln}_${region}`;
}

export function changeLanguage(toLanguageString: ?string, i18n: any) {
  if (toLanguageString && i18n.language !== toLanguageString) {
    // Languages are stored in en_US format in the database, however the
    // frontend translation framework (i18next) expects en-US
    i18n.changeLanguage(toLanguageString.replace("_", "-"));
  }
}
