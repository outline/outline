import type { Node } from "prosemirror-model";
import { isMermaid } from "./isCode";
import type { EditorView } from "prosemirror-view";
import { sanitizeUrl } from "@shared/utils/urls";

export abstract class LightboxImage {
  public pos: number;
  public src: string;
  public alt: string;
  public source: string;

  protected element: Element;

  constructor() {}

  public abstract getElement(): Element | null | undefined;
}

class LightboxRegularImage extends LightboxImage {
  constructor(view: EditorView, pos: number) {
    super();
    this.pos = pos;
    const node = view.state.doc.nodeAt(pos);
    this.src = sanitizeUrl(node?.attrs.src) ?? "";
    this.alt = node?.attrs.alt ?? "";
    this.source = node?.attrs.source;
    this.element = view.nodeDOM(pos) as HTMLSpanElement;
  }

  getElement() {
    return this.element.querySelector("img");
  }
}

class LightboxMermaidImage extends LightboxImage {
  constructor(view: EditorView, pos: number) {
    super();
    this.element = view.nodeDOM(pos) as HTMLDivElement;
    this.pos = pos;
    this.src = this.svgToSrc(this.extractSvg());
    this.alt = "";
  }

  private svgToSrc(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private extractSvg(): string {
    const mermaidWrapper = this.element.nextElementSibling;
    if (!mermaidWrapper) {
      return "";
    }
    const svg = mermaidWrapper.firstElementChild;
    if (!svg || !(svg instanceof SVGElement)) {
      return "";
    }

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  }

  getElement() {
    return this.element.nextElementSibling?.firstElementChild;
  }
}

export class LightboxImageFactory {
  static createLightboxImage(view: EditorView, pos: number): LightboxImage {
    const node = view.state.doc.nodeAt(pos)!;
    if (isImage(node)) {
      return new LightboxRegularImage(view, pos);
    }

    if (isMermaid(node)) {
      return new LightboxMermaidImage(view, pos);
    }

    throw new Error("Unsupported node type for LightboxImage");
  }
}

const isImage = (node: Node) => node.type.name === "image";

export const isLightboxNode = (node: Node) => isImage(node) || isMermaid(node);
