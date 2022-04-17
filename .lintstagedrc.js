export default {
  // Run tsc on changes to TypeScript files
  '**/*.ts?(x)': () => "tsc",

  // Efficiently run prettier on changes to JS and TypeScript files
  '**/*.[tj]s?(x)': (filenames) =>
    filenames.length > 20 ? 'yarn lint --fix' : `eslint ${filenames.join(' ')} --fix`,
  
  // Update translation files on changes
  '**/*.[tj]s?(x)': (filenames) => `i18next --silent ${filenames.join(' ')} && yarn copy:i18n`,
}