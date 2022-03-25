/**
 * Tiny EventEmitter implementation for the browser.
 */
export default class EventEmitter {
  private target: EventTarget;

  constructor() {
    this.target = new EventTarget();
  }

  on(
    name: string,
    callback: (...args: any[]) => unknown,
    options?: AddEventListenerOptions
  ) {
    callback.handler = (event: Event) => callback(...event.args);
    this.target.addEventListener(name, callback.handler, options);
  }

  off(name: string, callback: EventListener) {
    this.target.removeEventListener(name, callback.handler);
  }

  emit(name: string, ...args: any[]) {
    const event = new Event(name);
    event.args = args;
    this.target.dispatchEvent(event);
  }

  once(name: string, callback: EventListener) {
    this.on(name, callback, { once: true });
  }
}
