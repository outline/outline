// app/editor/extensions/FontAwesomeExtension.ts
import { Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { icon, library } from "@fortawesome/fontawesome-svg-core";
import * as solidIcons from "@fortawesome/free-solid-svg-icons";
import * as regularIcons from "@fortawesome/free-regular-svg-icons";
import * as brandIcons from "@fortawesome/free-brands-svg-icons";


// Register all icons when the extension is loaded
registerIcons();

export default class FontAwesomeExtension extends Extension {
  get name() {
    return "fontAwesome";
  }

  get plugins() {
    // Updated regex pattern to capture the icon type (fas, far, or fab)
    const fontAwesomeRegex = /\[\[(fas|far|fab)\s+(fa-[a-z-]+)\]\]/g;

    return [
      new Plugin({
        key: new PluginKey("fontAwesome"),
        props: {
          decorations(state) {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node: ProsemirrorNode, pos: number) => {
              if (!node.isText) {
                return;
              }

              const text = node.text || "";
              let match;
              fontAwesomeRegex.lastIndex = 0;

              while ((match = fontAwesomeRegex.exec(text)) !== null) {
                const start = pos + match.index;
                const end = start + match[0].length;
                const iconType = match[1] as 'fas' | 'far' | 'fab';
                const iconClass = match[2];

                // Create widget decoration to render the icon
                const decoration = Decoration.widget(start, () => {
                  const iconObj = getIcon(iconType, iconClass);

                  if (iconObj) {
                    const iconDef = icon(iconObj);
                    if (iconDef) {
                      const span = document.createElement('span');
                      span.innerHTML = iconDef.html.join('');
                      span.contentEditable = 'false';
                      span.style.display = 'inline-block';
                      span.className = 'fa-icon-wrapper';

                      // Add the specific icon type class for styling
                      span.classList.add(iconType);
                      return span;
                    }
                  }

                  // Fallback to a simple icon representation if not found
                  const iconName = iconClass.replace('fa-', '');
                  const fallback = document.createElement('span');
                  fallback.textContent = `[${iconType} ${iconName}]`;
                  fallback.className = 'fa-icon-not-found';
                  fallback.contentEditable = 'false';
                  return fallback;
                });

                decorations.push(decoration);

                // Hide the original text
                decorations.push(
                  Decoration.inline(start, end, {
                    style: "display: none",
                  })
                );
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  }

  get allowInReadOnly() {
    return true;
  }
}


function transformIconName(iconName: string): string {
  if (!iconName.startsWith('fa-')) {
    return iconName;
  }

  // Remove 'fa-' prefix
  const name = iconName.substring(3);

  // Convert kebab-case to camelCase and capitalize the first letter after 'fa'
  const transformedName = 'fa' + name.split('-').map((part, index) => {
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('');

  return transformedName;
}


// Get icon from the specified icon package
function getIcon(iconType: 'fas' | 'far' | 'fab', iconName: string) {
  const transformedName = transformIconName(iconName);

  let foundIcon = null;

  switch (iconType) {
    case 'fas':
      foundIcon = solidIcons[transformedName];
      break;
    case 'far':
      foundIcon = regularIcons[transformedName];
      break;
    case 'fab':
      foundIcon = brandIcons[transformedName];
      break;
  }

  // If not found in the specified set, try to find it in another set
  if (!foundIcon) {
    console.log(`Icon ${transformedName} not found in ${iconType}, searching in other sets`);

    if (iconType !== 'fas') foundIcon = solidIcons[transformedName];
    if (!foundIcon && iconType !== 'far') foundIcon = regularIcons[transformedName];
    if (!foundIcon && iconType !== 'fab') foundIcon = brandIcons[transformedName];
  }

  return foundIcon;
}


// Register all icons
function registerIcons() {
  // Add all solid icons
  const solidIconsArray = Object.keys(solidIcons)
    .filter(key => key.startsWith('fa'))
    .map(key => solidIcons[key]);

  // Add all regular icons
  const regularIconsArray = Object.keys(regularIcons)
    .filter(key => key.startsWith('fa'))
    .map(key => regularIcons[key]);

  // Add all brand icons
  const brandIconsArray = Object.keys(brandIcons)
    .filter(key => key.startsWith('fa'))
    .map(key => brandIcons[key]);

  // Register all icons
  library.add(...solidIconsArray, ...regularIconsArray, ...brandIconsArray);
}
