import { Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { icon, IconDefinition, library } from "@fortawesome/fontawesome-svg-core";
import * as solidIcons from "@fortawesome/free-solid-svg-icons";
import * as regularIcons from "@fortawesome/free-regular-svg-icons";
import * as brandIcons from "@fortawesome/free-brands-svg-icons";

interface IconCollection {
  [key: string]: IconDefinition;
}

export default class FontAwesome extends Extension {
  get name() {
    return "fontAwesome";
  }

  get plugins() {
    this.registerIcons();

    // Updated regex pattern to capture the icon type (fas, far, or fab)
    const fontAwesomeRegex = /\[\[(fas|far|fab)\s+(fa-[a-z-]+)]]/g;

    // Store a reference to 'this' to use inside the callback
    const self = this;

    return [
      new Plugin({
        key : new PluginKey("fontAwesome"),
        props : {
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
                const iconType = match[1] as "fas" | "far" | "fab";
                const iconClass = match[2];

                // Create widget decoration to render the icon
                const decoration = Decoration.widget(start, () => {
                  // Use 'self' instead of 'this' to access the extension methods
                  const iconObj = self.getIcon(iconType, iconClass);

                  if (iconObj) {
                    const iconDef = icon(iconObj);
                    if (iconDef) {
                      const span = document.createElement("span");
                      span.innerHTML = iconDef.html.join("");
                      span.contentEditable = "false";
                      span.style.display = "inline-block";
                      span.className = "fa-icon-wrapper";

                      // Add the specific icon type class for styling
                      span.classList.add(iconType);
                      return span;
                    }
                  }

                  // Fallback to a simple icon representation if not found
                  const iconName = iconClass.replace("fa-", "");
                  const fallback = document.createElement("span");
                  fallback.textContent = `[${iconType} ${iconName}]`;
                  fallback.className = "fa-icon-not-found";
                  fallback.contentEditable = "false";
                  return fallback;
                });

                decorations.push(decoration);

                // Hide the original text
                decorations.push(
                  Decoration.inline(start, end, {
                    style : "display: none",
                  }),
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


  private transformIconName(iconName: string): string {
    if (!iconName.startsWith("fa-")) {
      return iconName;
    }

    // Remove 'fa-' prefix
    const name = iconName.substring(3);

    // Convert kebab-case to camelCase and capitalize the first letter after 'fa'
    return "fa" + name.split("-").map((part, index) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join("");
  }

  // Get icon from the specified icon package
  private getIcon(iconType: "fas" | "far" | "fab", iconName: string): IconDefinition | null {
    const transformedName = this.transformIconName(iconName);

    let foundIcon: IconDefinition | null = null;

    // Cast the icon modules to the IconCollection type
    const solidIconsCollection = solidIcons as unknown as IconCollection;
    const regularIconsCollection = regularIcons as unknown as IconCollection;
    const brandIconsCollection = brandIcons as unknown as IconCollection;

    switch (iconType) {
      case "fas":
        foundIcon = solidIconsCollection[transformedName] || null;
        break;
      case "far":
        foundIcon = regularIconsCollection[transformedName] || null;
        break;
      case "fab":
        foundIcon = brandIconsCollection[transformedName] || null;
        break;
    }

    // If not found in the specified set, try to find it in another set
    if (!foundIcon) {
      console.log(`Icon ${transformedName} not found in ${iconType}, searching in other sets`);

      if (iconType !== "fas") foundIcon = solidIconsCollection[transformedName] || null;
      if (!foundIcon && iconType !== "far") foundIcon = regularIconsCollection[transformedName] || null;
      if (!foundIcon && iconType !== "fab") foundIcon = brandIconsCollection[transformedName] || null;
    }

    return foundIcon;
  }


  // Register all icons
  private registerIcons() {
    // Define a helper function for type-safe icon extraction
    const getIconsFromModule = (module: any): IconDefinition[] => {
      return Object.keys(module)
        .filter(key => key.startsWith("fa"))
        .map(key => module[key as keyof typeof module] as IconDefinition)
        .filter(icon => icon !== undefined);
    };

    // Get icons from each module
    const solidIconsArray = getIconsFromModule(solidIcons);
    const regularIconsArray = getIconsFromModule(regularIcons);
    const brandIconsArray = getIconsFromModule(brandIcons);

    // Register all icons
    library.add(...solidIconsArray, ...regularIconsArray, ...brandIconsArray);
  }
}