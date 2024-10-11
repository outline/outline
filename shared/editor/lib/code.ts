import Storage from "../../utils/Storage";
import { LANGUAGES } from "../extensions/Prism";

const RecentStorageKey = "rme-code-language";
const StorageKey = "frequent-code-languages";

export const FrequentlyUsedCount = {
  Get: 5,
  Track: 10,
};

export const setRecentCodeLanguage = (language: string) => {
  const frequentLangs = (Storage.get(StorageKey) ?? {}) as Record<
    string,
    number
  >;

  if (Object.keys(frequentLangs).length === 0) {
    const lastUsedLang = Storage.get(RecentStorageKey);
    if (lastUsedLang) {
      frequentLangs[lastUsedLang] = 1;
    }
  }

  frequentLangs[language] = (frequentLangs[language] ?? 0) + 1;

  const frequentLangEntries = Object.entries(frequentLangs);

  if (frequentLangEntries.length > FrequentlyUsedCount.Track) {
    sortFrequencies(frequentLangEntries);

    const lastEntry = frequentLangEntries[FrequentlyUsedCount.Track];
    if (lastEntry[0] === language) {
      frequentLangEntries.splice(FrequentlyUsedCount.Track - 1, 1);
    } else {
      frequentLangEntries.splice(FrequentlyUsedCount.Track);
    }
  }

  Storage.set(StorageKey, Object.fromEntries(frequentLangEntries));
  Storage.set(RecentStorageKey, language);
};

export const getRecentCodeLanguage = () => Storage.get(RecentStorageKey);

export const getFrequentCodeLanguages = () => {
  const recentLang = Storage.get(RecentStorageKey);
  const frequentLangEntries = Object.entries(Storage.get(StorageKey) ?? {}) as [
    keyof typeof LANGUAGES,
    number
  ][];

  const frequentLangs = sortFrequencies(frequentLangEntries)
    .slice(0, FrequentlyUsedCount.Get)
    .map(([lang]) => lang);

  const isRecentLangPresent = frequentLangs.includes(recentLang);
  if (recentLang && !isRecentLangPresent) {
    frequentLangs.pop();
    frequentLangs.push(recentLang);
  }

  return frequentLangs;
};

const sortFrequencies = <T>(freqs: [T, number][]) =>
  freqs.sort((a, b) => (a[1] >= b[1] ? -1 : 1));
