const storage: Record<string, string> = {};

const localStorage: Storage = {
  setItem(key: string, value: string) {
    storage[key] = value || "";
  },
  getItem(key: string) {
    return key in storage ? storage[key] : null;
  },
  removeItem(key: string) {
    delete storage[key];
  },
  clear() {
    Object.keys(storage).forEach((key) => delete storage[key]);
  },
  get length() {
    return Object.keys(storage).length;
  },
  key(i: number) {
    const keys = Object.keys(storage);
    return keys[i] || null;
  },
};

export default localStorage;
