# Translation

Outline is localized through community contributions. The text in Outline's user interface is in American English by default, we're very thankful for all help that the community provides bringing the app to different languages. 

## Externalizing strings

Before a string can be translated, it must be externalized. This is the process where English strings in the source code are wrapped in a function that retrieves the translated string for the user’s language.

For externalization we use [react-i18next](https://react.i18next.com/), this provides the hooks [useTranslation](https://react.i18next.com/latest/usetranslation-hook) and the [Trans](https://react.i18next.com/latest/trans-component) component for wrapping English text.

PR's are accepted for wrapping English strings in the codebase that were not previously externalized.

## Translating strings

To manage the translation process we use [CrowdIn](https://translate.getoutline.com/), it keeps track of which strings in which languages still need translating, synchronizes with the codebase automatically, and provides a great editor interface.

You'll need to create a free account to use CrowdIn. Once you have joined, you can provide translations by following these steps:

1. Select the language for which you want to contribute (or vote for) a translation (below the language you can see the progress of the translation)
![CrowdIn UI](https://i.imgur.com/AkbDY60.png)

2. Please choose the translation.json file from your desired language

3. Once a file is selected, all the strings associated with the version are displayed on the left side. To display the untranslated strings first, select the filter icon next to the search bar and select “All, Untranslated First”.The red square next to an English string shows that a string has not been translated yet. To provide a translation, select a string on the left side, provide a translation in the target language in the text box in the right side (singular and plural) and press the save button. As soon as a translation has been provided by another user (green square next to string), you can also vote on a translation provided by another user. The translation with the most votes is used unless a different translation has been approved by a proof reader. ![Editor UI](https://i.imgur.com/pldZCRs.png)

## Proofreading

Once a translation has been provided, a proof reader can approve the translation and mark it for use in Outline.

If you are interested in becoming a proof reader, please contact one of the project managers in the Outline CrowdIn project or contact [@tommoor](https://github.com/tommoor). Similarly, if your language is not listed in the list of CrowdIn languages, please contact our project managers or [send us an email](https://www.getoutline.com/contact) so we can add your language.

## Release

Updated translations are automatically PR'd against the codebase by a bot and will be merged regularly so that new translations appear in the next release of Outline.