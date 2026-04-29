/**
 * A tiny EventEmitter implementation for the browser.
 */
export default class EventEmitter {
  private listeners: { [name: string]: ((data: unknown) => unknown)[] } = {};

  public addListener(name: string, callback: (data: unknown) => unknown) {
    if (!this.listeners[name]) {
      this.listeners[name] = [];
    }

    this.listeners[name].push(callback);
  }

  public removeListener(name: string, callback: (data: unknown) => unknown) {
    this.listeners[name] = this.listeners[name]?.filter(
      (cb) => cb !== callback
    );
  }

  public on = (name: string, callback: (data: unknown) => unknown) =>
    this.addListener(name, callback);

  public off = (name: string, callback: (data: unknown) => unknown) =>
    this.removeListener(name, callback);

  public emit(name: string, data?: unknown) {
    this.listeners[name]?.forEach((callback) => {
      callback(data);
    });
  }
}
