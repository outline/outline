// app/editor/extensions/FontAwesomeExtension.ts
import { Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { library, icon, dom } from "@fortawesome/fontawesome-svg-core";
import { faHouse, faUser, faPen } from "@fortawesome/free-solid-svg-icons";

// Add the icons you want to use
library.add(faHouse, faUser, faPen);

// Map of fa-names to actual icon imports
const iconMap: Record<string, any> = {
  "fa-house": faHouse,
  "fa-user": faUser,
  "fa-pen": faPen,
  // Add more icons as needed
};

export default class FontAwesomeExtension extends Extension {
  get name() {
    return "fontAwesome";
  }

  get plugins() {
    const fontAwesomeRegex = /\[\[fa\s+(fa-[a-z-]+)\]\]/g;

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
                const iconClass = match[1];

                // Create widget decoration to render the icon
                const decoration = Decoration.widget(start, () => {
                  const iconName = iconClass.replace('fa-', '');

                  // If we have the icon in our map, use it
                  if (iconMap[iconClass]) {
                    const iconDef = icon(iconMap[iconClass]);
                    if (iconDef) {
                      const iconHTML = iconDef.html[0];
                      const span = document.createElement('span');
                      span.innerHTML = iconHTML;
                      span.contentEditable = 'false';
                      span.style.display = 'inline-block';
                      span.className = 'fa-icon-wrapper';
                      return span;
                    }
                  }

                  // Fallback to a simple icon representation if not found
                  const fallback = document.createElement('span');
                  fallback.textContent = `[${iconName}]`;
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