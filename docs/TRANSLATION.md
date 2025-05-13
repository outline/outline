# Translation

Outline is localized through community contributions. The text in Outline's user interface is in American English by default, we're very thankful for all help that the community provides bringing the app to different languages. 

## Externalizing strings

Before a string can be translated, it must be externalized. This is the process where English strings in the source code are wrapped in a function that retrieves the translated string for the user's language.

For externalization we use [react-i18next](https://react.i18next.com/), this provides the hooks [useTranslation](https://react.i18next.com/latest/usetranslation-hook) and the [Trans](https://react.i18next.com/latest/trans-component) component for wrapping English text.

#### Example of Externalizing a String

Suppose you have a component with a hardcoded string:

```jsx
// Before externalization
function MyComponent() {
  return <p>Hello World!</p>;
}
```

To externalize "Hello World!", you would use the `useTranslation` hook:

```jsx
// After externalization
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <p>{t("helloWorld", "Hello World!")}</p>;
  // "helloWorld" is the key that will be used in translation.json
  // "Hello World!" is the default fallback text
}
```

Alternatively, for more complex strings involving HTML elements or variables, the `Trans` component can be used. Refer to the [react-i18next documentation](https://react.i18next.com/latest/trans-component) for detailed usage.

PR's are accepted for wrapping English strings in the codebase that were not previously externalized.

## Translating strings

To manage the translation process we use [CrowdIn](https://translate.getoutline.com/), it keeps track of which strings in which languages still need translating, synchronizes with the codebase automatically, and provides a great editor interface.

You'll need to create a free account to use CrowdIn. Once you have joined, you can provide translations by following these steps:

1. Select the language for which you want to contribute (or vote for) a translation (below the language you can see the progress of the translation)
![CrowdIn UI](https://i.imgur.com/AkbDY60.png)

2. Please choose the translation.json file from your desired language

3. Once a file is selected, all the strings associated with the version are displayed on the left side. To display the untranslated strings first, select the filter icon next to the search bar and select "All, Untranslated First".The red square next to an English string shows that a string has not been translated yet. To provide a translation, select a string on the left side, provide a translation in the target language in the text box in the right side (including forms for singular and plural, if applicable for the string and language) and press the save button. Handling pluralization correctly is essential for grammatically accurate translations in many languages. For more details on how `i18next` handles plurals, you can refer to the [i18next documentation on pluralization](https://www.i18next.com/translation-function/plurals). As soon as a translation has been provided by another user (green square next to string), you can also vote on a translation provided by another user. The translation with the most votes is used unless a different translation has been approved by a proof reader. ![Editor UI](https://i.imgur.com/pldZCRs.png)

## Proofreading

Once a translation has been provided, a proof reader can approve the translation and mark it for use in Outline.

If you are interested in becoming a proof reader, please contact one of the project managers in the Outline CrowdIn project or contact [@tommoor](https://github.com/tommoor). Similarly, if your language is not listed in the list of CrowdIn languages, please contact our project managers or [send us an email](https://www.getoutline.com/contact) so we can add your language.

## Release

Updated translations are automatically PR'd against the codebase by a bot and will be merged regularly so that new translations appear in the next release of Outline.

## Common Pitfalls and Best Practices

### String Externalization

1. **Avoid String Concatenation**
   ```jsx
   // ❌ Bad: String concatenation makes translation difficult
   const message = "You have " + count + " new notifications";
   
   // ✅ Good: Use interpolation with t function
   const message = t("notifications", "You have {{count}} new notifications", { count });
   ```

2. **Handle Variables Properly**
   ```jsx
   // ❌ Bad: Variables in separate strings
   const message = t("welcome") + " " + userName;
   
   // ✅ Good: Pass variables to translation function
   const message = t("welcome", "Welcome, {{name}}!", { name: userName });
   ```

3. **Consider Context**
   ```jsx
   // ✅ Good: Provide context for ambiguous terms
   const message = t("save", "Save", { context: "button" });
   const message2 = t("save", "Save", { context: "document" });
   ```

### Translation Guidelines

1. **Maintain Original Meaning**: Ensure translations preserve the original meaning and intent of the text.

2. **Consider Cultural Context**: Some phrases or idioms may need adaptation for different cultures.

3. **Keep Formatting**: Preserve any formatting (bold, italic, links) in your translations.

4. **Test Your Translations**: If possible, test your translations in the actual interface to ensure they fit properly.

5. **Use Comments**: If a string needs special attention or context, use the comment feature in CrowdIn to help other translators.

### Pluralization Examples

```jsx
// Example of pluralization in code
const message = t("items", "{{count}} item", "{{count}} items", {
  count: itemCount,
  postProcess: "interval",
  // This will use different forms based on the count
  // 0: "0 items"
  // 1: "1 item"
  // 2+: "2 items"
});
```

For more detailed information about handling plurals in different languages, refer to the [i18next pluralization guide](https://www.i18next.com/translation-function/plurals).