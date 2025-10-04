import { Node } from "prosemirror-model";
import { isCode } from "./isCode";
import { EditorView } from "prosemirror-view";
import { sanitizeUrl } from "@shared/utils/urls";

export abstract class LightboxImage {
  protected pos: number;
  protected element: Element;
  protected src: string;
  protected alt: string;

  constructor() {}

  public abstract getElement(): Element | null | undefined;
  public abstract getSrc(): string;
  public abstract getAlt(): string;
  public abstract getPos(): number;
}

class LightboxRegularImage extends LightboxImage {
  constructor(view: EditorView, pos: number) {
    super();
    this.pos = pos;
    const node = view.state.doc.nodeAt(pos);
    this.src = sanitizeUrl(node?.attrs.src) ?? "";
    this.alt = node?.attrs.alt ?? "";
    this.element = view.nodeDOM(pos) as HTMLSpanElement;
  }

  getElement() {
    return this.element.querySelector("img");
  }

  getSrc() {
    return this.src;
  }

  getAlt() {
    return this.alt;
  }

  getPos() {
    return this.pos;
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
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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

    return svg.outerHTML;
  }

  getElement() {
    return this.element.nextElementSibling?.firstElementChild;
  }

  getSrc() {
    return this.src;
  }

  getAlt() {
    return this.alt;
  }

  getPos() {
    return this.pos;
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
const isMermaid = (node: Node) =>
  isCode(node) && node.attrs.language === "mermaidjs";

export const isLightboxNode = (node: Node) => isImage(node) || isMermaid(node);
