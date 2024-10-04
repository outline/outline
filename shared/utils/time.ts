export class Second {
  /** Milliseconds in a second */
  public static ms = 1000;
}

export class Minute {
  /** Milliseconds in a minute */
  public static ms = 60 * Second.ms;
  /** Seconds in a minute */
  public static seconds = 60;
}

export class Hour {
  /** Milliseconds in an hour */
  public static ms = 60 * Minute.ms;
  /** Seconds in an hour */
  public static seconds = 60 * Minute.seconds;
  /** Minutes in an hour */
  public static minutes = 60;
}

export class Day {
  /** Milliseconds in a day */
  public static ms = 24 * Hour.ms;
  /** Seconds in a day */
  public static seconds = 24 * Hour.seconds;
  /** Minutes in a day */
  public static minutes = 24 * Hour.minutes;
}
