/* eslint-disable flowtype/require-valid-file-annotation */
import { difference, intersection } from "lodash";
import { initI18n, i18n, en_US, de_DE, pt_PT } from "./i18n";

describe("i18n configuration", () => {
  beforeEach(() => {
    initI18n();
  });
  it("en_US and de_DE should have same keys", () => {
    const en_US_Keys = Object.keys(en_US);
    const de_DE_Keys = Object.keys(de_DE);

    var same = intersection(en_US_Keys, de_DE_Keys);
    var diff1 = difference(en_US_Keys, same);
    var diff2 = difference(de_DE_Keys, same);
    if (diff1.length) console.log(diff1);
    if (diff2.length) console.log(diff2);

    expect(diff1.length).toBe(0);
    expect(diff2.length).toBe(0);
  });
  it("en_US and pt_PT should have same keys", () => {
    const en_US_Keys = Object.keys(en_US);
    const pt_PT_Keys = Object.keys(pt_PT);

    var same = intersection(en_US_Keys, pt_PT_Keys);
    var diff1 = difference(en_US_Keys, same);
    var diff2 = difference(pt_PT_Keys, same);
    if (diff1.length) console.log(diff1);
    if (diff2.length) console.log(diff2);

    expect(diff1.length).toBe(0);
    expect(diff2.length).toBe(0);
  });
});

describe("i18n process.env is unset", () => {
  beforeEach(() => {
    delete process.env.DEFAULT_LANGUAGE;
    initI18n();
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
    initI18n();
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
    initI18n();
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
    initI18n();
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
