/**
 * A tiny EventEmitter implementation for the browser.
 */
export default class EventEmitter {
  private listeners: { [name: string]: ((data: any) => unknown)[] } = {};

  public addListener(name: string, callback: (data: any) => unknown) {
    if (!this.listeners[name]) {
      this.listeners[name] = [];
    }

    this.listeners[name].push(callback);
  }

  public removeListener(name: string, callback: (data: any) => unknown) {
    this.listeners[name] = this.listeners[name]?.filter(
      (cb) => cb !== callback
    );
  }

  public on = this.addListener;
  public off = this.removeListener;

  public emit(name: string, data?: any) {
    this.listeners[name]?.forEach((callback) => {
      callback(data);
    });
  }
}
