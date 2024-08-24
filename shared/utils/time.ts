export class Second {
  /** Milliseconds in a second */
  public static milliseconds = 1000;
}

export class Minute {
  /** Milliseconds in a minute */
  public static milliseconds = 60 * Second.milliseconds;
  /** Seconds in a minute */
  public static seconds = 60;
}

export class Hour {
  /** Milliseconds in an hour */
  public static milliseconds = 60 * Minute.milliseconds;
  /** Seconds in an hour */
  public static seconds = 60 * Minute.seconds;
  /** Minutes in an hour */
  public static minutes = 60;
}

export class Day {
  /** Milliseconds in a day */
  public static milliseconds = 24 * Hour.milliseconds;
  /** Seconds in a day */
  public static seconds = 24 * Hour.seconds;
  /** Minutes in a day */
  public static minutes = 24 * Hour.minutes;
}
