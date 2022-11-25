export default class Desktop {
  static isElectron() {
    return navigator?.userAgent?.includes("Electron");
  }
}
