import { addDays } from "date-fns";
import i18n from "i18next";
import { computed, observable } from "mobx";
import type { ProsemirrorData } from "@shared/types";
import { isRTL } from "@shared/utils/rtl";
import slugify from "@shared/utils/slugify";
import type TemplatesStore from "~/stores/TemplatesStore";
import User from "~/models/User";
import { settingsPath } from "~/utils/routeHelpers";
import Collection from "./Collection";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";
import type { Searchable } from "./interfaces/Searchable";

export default class Template extends ParanoidModel implements Searchable {
  static modelName = "Template";

  store: TemplatesStore;

  @Field
  @observable.shallow
  data: ProsemirrorData;

  @computed
  get searchContent(): string {
    return this.title;
  }

  @computed
  get searchSuppressed(): boolean {
    return this.isDeleted;
  }

  /**
   * The id of the collection that this template belongs to, if any.
   */
  @Field
  @observable
  collectionId?: string | null;

  /**
   * The collection that this template belongs to.
   */
  @Relation(() => Collection, { onDelete: "cascade" })
  collection?: Collection;

  /**
   * The id of the parent template that this template is nested under, if any.
   */
  @Field
  @observable
  parentDocumentId?: string | null;

  /**
   * The number of direct child templates, as reported by the server. May be
   * undefined when the template has not been loaded through a list endpoint.
   */
  @observable
  childCount?: number;

  /**
   * The parent template that this template is nested under, if any.
   */
  @Relation(() => Template, { onDelete: "cascade" })
  parentDocument?: Template;

  /**
   * The child templates nested directly under this template, if loaded.
   */
  @computed
  get childTemplates(): Template[] {
    return this.store.childTemplatesOf(this.id);
  }

  /**
   * Whether this template contains nested templates.
   */
  @computed
  get hasChildTemplates(): boolean {
    return (this.childCount ?? 0) > 0 || this.childTemplates.length > 0;
  }

  /**
   * The chain of ancestor templates from the root down to (excluding) this
   * template. Only ancestors loaded in the store are returned.
   */
  @computed
  get pathToTemplate(): Template[] {
    const ancestors: Template[] = [];
    let parent = this.parentDocument;

    while (parent && !ancestors.includes(parent)) {
      ancestors.unshift(parent);
      parent = parent.parentDocument;
    }

    return ancestors;
  }

  /**
   * The nesting depth of this template, where root templates have a depth
   * of zero. Only counts ancestors loaded in the store.
   */
  @computed
  get depth(): number {
    return this.pathToTemplate.length;
  }

  /**
   * The title of the template.
   */
  @Field
  @observable
  title: string;

  /**
   * An icon (or) emoji to use as the template icon.
   */
  @Field
  @observable
  icon?: string | null;

  /**
   * The color to use for the template icon.
   */
  @Field
  @observable
  color?: string | null;

  /**
   * Whether the template layout is displayed full page width.
   */
  @Field
  @observable
  fullWidth: boolean;

  /**
   * The likely language of the template, in ISO 639-1 format.
   */
  @Field
  @observable
  language: string | undefined;

  @Relation(() => User)
  createdBy: User | undefined;

  @Relation(() => User)
  updatedBy: User | undefined;

  @observable
  urlId: string;

  /**
   * Returns the direction of the template text, either "rtl" or "ltr"
   */
  @computed
  get dir(): "rtl" | "ltr" {
    return this.rtl ? "rtl" : "ltr";
  }

  /**
   * Returns true if the template text is right-to-left
   */
  @computed
  get rtl() {
    return isRTL(this.title);
  }

  @computed
  get path(): string {
    if (!this.title) {
      return `${settingsPath("templates")}/untitled-${this.urlId}`;
    }

    const slugifiedTitle = slugify(this.title);
    return `${settingsPath("templates")}/${slugifiedTitle}-${this.urlId}`;
  }

  @computed
  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  @computed
  get hasEmptyTitle(): boolean {
    return this.title === "";
  }

  @computed
  get isWorkspaceTemplate(): boolean {
    return !this.collectionId;
  }

  @computed
  get permanentlyDeletedAt(): string | undefined {
    if (!this.deletedAt) {
      return undefined;
    }

    return addDays(new Date(this.deletedAt), 30).toString();
  }

  get titleWithDefault(): string {
    return this.title || i18n.t("Untitled");
  }

  @computed
  get initial(): string {
    return (this.titleWithDefault?.charAt(0) ?? "?").toUpperCase();
  }

  @computed
  get isActive(): boolean {
    return !this.isDeleted;
  }
}
