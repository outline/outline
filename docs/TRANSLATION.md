# Translation

Outline is localized through community contributions. The text in Outline's user interface is in American English by default, we're very thankful for all help that the community provides bringing the app to different languages. 

## Externalizing strings

Before a string can be translated, it must be externalized. This is the process where English strings in the source code are wrapped in a function that retrieves the translated string for the user's language.

For externalization we use [react-i18next](https://react.i18next.com/), this provides the hooks [useTranslation](https://react.i18next.com/latest/usetranslation-hook) and the [Trans](https://react.i18next.com/latest/trans-component) component for wrapping English text.

### Basic String Externalization

```jsx
// Before externalization
function MyComponent() {
  return <p>Hello World!</p>;
}

// After externalization
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <p>{t("helloWorld", "Hello World!")}</p>;
}
```

### Complex String Externalization

For strings with HTML elements or variables:

```jsx
// Before externalization
function WelcomeMessage({ name }) {
  return (
    <p>
      Welcome, <strong>{name}</strong>! You have <a href="/notifications">3 new notifications</a>.
    </p>
  );
}

// After externalization
import { useTranslation, Trans } from "react-i18next";

function WelcomeMessage({ name, notificationCount }) {
  const { t } = useTranslation();
  
  return (
    <p>
      <Trans
        i18nKey="welcomeMessage"
        defaults="Welcome, <strong>{{name}}</strong>! You have <a>3 new notifications</a>."
        values={{
          name,
          count: notificationCount,
        }}
        components={{
          strong: <strong />,
          a: <a href="/notifications" />,
        }}
      />
    </p>
  );
}
```

## Translating strings

To manage the translation process we use [CrowdIn](https://translate.getoutline.com/), it keeps track of which strings in which languages still need translating, synchronizes with the codebase automatically, and provides a great editor interface.

### Getting Started with CrowdIn

1. Create a free account at [CrowdIn](https://translate.getoutline.com/)
2. Select your target language
3. Choose the `translation.json` file
4. Use the filter "All, Untranslated First" to find strings needing translation

### Translation Process

1. **Select a String**: Click on an untranslated string (marked with a red square)
2. **Provide Translation**: Enter your translation in the right panel
3. **Handle Pluralization**: If the string has plural forms, fill in all required forms
4. **Save**: Click the save button to submit your translation
5. **Vote**: You can vote on existing translations (green square)

### Pluralization Guide

Different languages have different plural rules. Here's how to handle them:

```json
{
  "items": {
    "one": "{{count}} item",
    "other": "{{count}} items"
  }
}
```

Common plural forms:
- English: one, other
- French: one, other
- Russian: one, few, many, other
- Arabic: zero, one, two, few, many, other

## Proofreading

Once a translation has been provided, a proof reader can approve the translation and mark it for use in Outline.

### Becoming a Proofreader

1. Contact project managers in the Outline CrowdIn project
2. Or reach out to [@tommoor](https://github.com/tommoor)
3. For new language requests, contact [project managers](https://www.getoutline.com/contact)

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

### Translation Quality Guidelines

1. **Accuracy and Consistency**
   - Use consistent terminology throughout the application
   - Maintain the same tone and style as the original text
   - Ensure technical terms are translated correctly and consistently
   - Keep brand names and product names unchanged

2. **Language-Specific Considerations**
   - Adapt date and time formats to local conventions
   - Use appropriate number formatting (decimal points, thousands separators)
   - Consider right-to-left (RTL) languages for layout
   - Account for different text lengths in UI elements

3. **Technical Accuracy**
   - Preserve all HTML tags and attributes
   - Maintain correct variable placeholders ({{variable}})
   - Keep special characters and symbols intact
   - Ensure proper escaping of quotes and special characters

4. **Style and Tone**
   - Match the application's voice (formal, friendly, technical)
   - Use natural language that sounds native to the target language
   - Avoid literal translations that sound awkward
   - Maintain appropriate formality level

5. **UI Considerations**
   - Ensure translations fit within UI elements
   - Consider text expansion/contraction in different languages
   - Maintain proper spacing and alignment
   - Test translations in context of the full interface

6. **Quality Checklist**
   - [ ] Translation is accurate and maintains original meaning
   - [ ] All variables and placeholders are preserved
   - [ ] Formatting and HTML tags are intact
   - [ ] Text fits within UI constraints
   - [ ] Terminology is consistent with other translations
   - [ ] Cultural context is appropriate
   - [ ] No machine translation artifacts
   - [ ] Proper handling of pluralization
   - [ ] Correct use of punctuation for the target language

7. **Common Mistakes to Avoid**
   - Don't translate brand names or product names
   - Don't modify HTML structure or attributes
   - Don't change variable names or placeholders
   - Don't use machine translation without human review
   - Don't ignore cultural context or local conventions
   - Don't mix formal and informal language
   - Don't leave placeholder text untranslated

## Troubleshooting

### Common Issues

1. **Missing Translations**
   - Check if the string is properly externalized
   - Verify the translation key matches in both code and translation file
   - Ensure the translation is saved in CrowdIn

2. **Pluralization Problems**
   - Verify all required plural forms are provided
   - Check if the language's plural rules are correctly configured
   - Test with different numbers to ensure correct form selection

3. **Formatting Issues**
   - Preserve HTML tags in the correct order
   - Maintain variable placeholders
   - Keep special characters (%, $, etc.) in the correct position

### Testing Translations

1. **Local Testing**
   ```bash
   # Set language for testing
   export LANGUAGE=fr
   # Or in the browser
   localStorage.setItem('language', 'fr')
   ```

2. **CrowdIn Preview**
   - Use the preview feature in CrowdIn
   - Test with different screen sizes
   - Verify formatting and layout

## Release Process

Updated translations are automatically PR'd against the codebase by a bot and will be merged regularly so that new translations appear in the next release of Outline.

### Translation Status

- 🟢 Green: Translation complete and approved
- 🟡 Yellow: Translation in progress
- 🔴 Red: Translation needed
- ⭐ Star: Translation approved by proofreader

## Additional Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Pluralization Guide](https://www.i18next.com/translation-function/plurals)
- [CrowdIn Help Center](https://support.crowdin.com/)
- [Outline Translation Project](https://translate.getoutline.com/)