/* eslint-disable flowtype/require-valid-file-annotation */
import { isEqual } from "lodash";
import { outlineTranslation, i18n, en_US, de_DE, pt_PT } from "./i18n";

describe("i18n configuration", () => {
  beforeEach(() => {
    outlineTranslation.init();
  });
  it("all languages should have same keys", () => {
    const en_US_Keys = Object.keys(en_US);
    const de_DE_Keys = Object.keys(de_DE);
    const pt_PT_Keys = Object.keys(pt_PT);

    expect(isEqual(en_US_Keys, de_DE_Keys)).toBe(true);
    expect(isEqual(en_US_Keys, pt_PT_Keys)).toBe(true);
  });
});

describe("i18n process.env is unset", () => {
  beforeEach(() => {
    delete process.env.DEFAULT_LANGUAGE;
    outlineTranslation.init();
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Saving…"));

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is en_US", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "en_US";
    outlineTranslation.init();
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Saving…"));

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is de_DE", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "de_DE";
    outlineTranslation.init();
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("Am speichern…"));

  it("translation if changed to en_US", () => {
    i18n.changeLanguage("en_US");
    expect(i18n.t("Saving…")).toBe("Saving…");
  });

  it("translation if changed to pt_PT", () => {
    i18n.changeLanguage("pt_PT");
    expect(i18n.t("Saving…")).toBe("A guardar…");
  });
});

describe("i18n process.env is pt_PT", () => {
  beforeEach(() => {
    process.env.DEFAULT_LANGUAGE = "pt_PT";
    outlineTranslation.init();
  });

  it("translation of key should match", () =>
    expect(i18n.t("Saving…")).toBe("A guardar…"));

  it("translation if changed to en_US", () => {
    i18n.changeLanguage("en_US");
    expect(i18n.t("Saving…")).toBe("Saving…");
  });

  it("translation if changed to de_DE", () => {
    i18n.changeLanguage("de_DE");
    expect(i18n.t("Saving…")).toBe("Am speichern…");
  });
});
