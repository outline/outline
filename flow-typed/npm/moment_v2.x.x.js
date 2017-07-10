// flow-typed signature: 18b0758a665cf7eb72bdb60fb6713aca
// flow-typed version: 5eb011abdd/moment_v2.x.x/flow_>=v0.34.x

type moment$MomentOptions = {
  y?: number|string,
  year?: number|string,
  years?: number|string,
  M?: number|string,
  month?: number|string,
  months?: number|string,
  d?: number|string,
  day?: number|string,
  days?: number|string,
  date?: number|string,
  h?: number|string,
  hour?: number|string,
  hours?: number|string,
  m?: number|string,
  minute?: number|string,
  minutes?: number|string,
  s?: number|string,
  second?: number|string,
  seconds?: number|string,
  ms?: number|string,
  millisecond?: number|string,
  milliseconds?: number|string,
};

type moment$MomentObject = {
  years: number,
  months: number,
  date: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
};

type moment$MomentCreationData = {
  input: string,
  format: string,
  locale: Object,
  isUTC: bool,
  strict: bool,
};

type moment$CalendarFormat = string | (moment: moment$Moment) => string;

type moment$CalendarFormats = {
  sameDay?: moment$CalendarFormat,
  nextDay?: moment$CalendarFormat,
  nextWeek?: moment$CalendarFormat,
  lastDay?: moment$CalendarFormat,
  lastWeek?: moment$CalendarFormat,
  sameElse?: moment$CalendarFormat,
};

type moment$Inclusivity = '()' | '[)' | '()' | '(]' | '[]'

declare class moment$LocaleData {
  months(moment: moment$Moment): string;
  monthsShort(moment: moment$Moment): string;
  monthsParse(month: string): number;
  weekdays(moment: moment$Moment): string;
  weekdaysShort(moment: moment$Moment): string;
  weekdaysMin(moment: moment$Moment): string;
  weekdaysParse(weekDay: string): number;
  longDateFormat(dateFormat: string): string;
  isPM(date: string): bool;
  meridiem(hours: number, minutes: number, isLower: bool): string;
  calendar(key: 'sameDay'|'nextDay'|'lastDay'|'nextWeek'|'prevWeek'|'sameElse', moment: moment$Moment): string;
  relativeTime(number: number, withoutSuffix: bool, key: 's'|'m'|'mm'|'h'|'hh'|'d'|'dd'|'M'|'MM'|'y'|'yy', isFuture: bool): string;
  pastFuture(diff: any, relTime: string): string;
  ordinal(number: number): string;
  preparse(str: string): any;
  postformat(str: string): any;
  week(moment: moment$Moment): string;
  invalidDate(): string;
  firstDayOfWeek(): number;
  firstDayOfYear(): number;
}
declare class moment$MomentDuration {
  humanize(suffix?: bool): string;
  milliseconds(): number;
  asMilliseconds(): number;
  seconds(): number;
  asSeconds(): number;
  minutes(): number;
  asMinutes(): number;
  hours(): number;
  asHours(): number;
  days(): number;
  asDays(): number;
  months(): number;
  asMonths(): number;
  years(): number;
  asYears(): number;
  add(value: number|moment$MomentDuration|Object, unit?: string): this;
  subtract(value: number|moment$MomentDuration|Object, unit?: string): this;
  as(unit: string): number;
  get(unit: string): number;
  toJSON(): string;
  toISOString(): string;
}
declare class moment$Moment {
  static ISO_8601: string;
  static (string?: string, format?: string|Array<string>, locale?: string, strict?: bool): moment$Moment;
  static (
      initDate: ?Object|number|Date|Array<number>|moment$Moment|string,
      validFormats?: ?Array<string>|string,
      locale?: ?boolean|string,
      strict?: ?boolean|string
  ): moment$Moment;
  static unix(seconds: number): moment$Moment;
  static utc(): moment$Moment;
  static utc(number: number|Array<number>): moment$Moment;
  static utc(str: string, str2?: string|Array<string>, str3?: string): moment$Moment;
  static utc(moment: moment$Moment): moment$Moment;
  static utc(date: Date): moment$Moment;
  static parseZone(rawDate: string): moment$Moment;
  isValid(): bool;
  invalidAt(): 0|1|2|3|4|5|6;
  creationData(): moment$MomentCreationData;
  millisecond(number: number): this;
  milliseconds(number: number): this;
  millisecond(): number;
  milliseconds(): number;
  second(number: number): this;
  seconds(number: number): this;
  second(): number;
  seconds(): number;
  minute(number: number): this;
  minutes(number: number): this;
  minute(): number;
  minutes(): number;
  hour(number: number): this;
  hours(number: number): this;
  hour(): number;
  hours(): number;
  date(number: number): this;
  dates(number: number): this;
  date(): number;
  dates(): number;
  day(day: number|string): this;
  days(day: number|string): this;
  day(): number;
  days(): number;
  weekday(number: number): this;
  weekday(): number;
  isoWeekday(number: number): this;
  isoWeekday(): number;
  dayOfYear(number: number): this;
  dayOfYear(): number;
  week(number: number): this;
  weeks(number: number): this;
  week(): number;
  weeks(): number;
  isoWeek(number: number): this;
  isoWeeks(number: number): this;
  isoWeek(): number;
  isoWeeks(): number;
  month(number: number): this;
  months(number: number): this;
  month(): number;
  months(): number;
  quarter(number: number): this;
  quarter(): number;
  year(number: number): this;
  years(number: number): this;
  year(): number;
  years(): number;
  weekYear(number: number): this;
  weekYear(): number;
  isoWeekYear(number: number): this;
  isoWeekYear(): number;
  weeksInYear(): number;
  isoWeeksInYear(): number;
  get(string: string): number;
  set(unit: string, value: number): this;
  set(options: { [unit: string]: number }): this;
  static max(...dates: Array<moment$Moment>): moment$Moment;
  static max(dates: Array<moment$Moment>): moment$Moment;
  static min(...dates: Array<moment$Moment>): moment$Moment;
  static min(dates: Array<moment$Moment>): moment$Moment;
  add(value: number|moment$MomentDuration|moment$Moment|Object, unit?: string): this;
  subtract(value: number|moment$MomentDuration|moment$Moment|string|Object, unit?: string): this;
  startOf(unit: string): this;
  endOf(unit: string): this;
  local(): this;
  utc(): this;
  utcOffset(offset: number|string, keepLocalTime?: boolean, keepMinutes?: boolean): this;
  utcOffset(): number;
  format(format?: string): string;
  fromNow(removeSuffix?: bool): string;
  from(value: moment$Moment|string|number|Date|Array<number>, removePrefix?: bool): string;
  toNow(removePrefix?: bool): string;
  to(value: moment$Moment|string|number|Date|Array<number>, removePrefix?: bool): string;
  calendar(refTime?: any, formats?: moment$CalendarFormats): string;
  diff(date: moment$Moment|string|number|Date|Array<number>, format?: string, floating?: bool): number;
  valueOf(): number;
  unix(): number;
  daysInMonth(): number;
  toDate(): Date;
  toArray(): Array<number>;
  toJSON(): string;
  toISOString(): string;
  toObject(): moment$MomentObject;
  isBetween(from: moment$Moment|string|number|Date|Array<number>, to: moment$Moment|string|number|Date|Array<number>, units?: string, inclusivity?: moment$Inclusivity): bool;
  isBefore(date?: moment$Moment|string|number|Date|Array<number>, units?: ?string): bool;
  isSame(date?: moment$Moment|string|number|Date|Array<number>, units?: ?string): bool;
  isAfter(date?: moment$Moment|string|number|Date|Array<number>, units?: ?string): bool;
  isSameOrBefore(date?: moment$Moment|string|number|Date|Array<number>, units?: ?string): bool;
  isSameOrAfter(date?: moment$Moment|string|number|Date|Array<number>, units?: ?string): bool;
  isDST(): bool;
  isDSTShifted(): bool;
  isLeapYear(): bool;
  clone(): moment$Moment;
  static isMoment(obj: any): bool;
  static isDate(obj: any): bool;
  static locale(locale: string, localeData?: Object): string;
  static updateLocale(locale: string, localeData?: ?Object): void;
  static locale(locales: Array<string>): string;
  locale(locale: string, customization?: Object|null): moment$Moment;
  locale(): string;
  static months(): Array<string>;
  static monthsShort(): Array<string>;
  static weekdays(): Array<string>;
  static weekdaysShort(): Array<string>;
  static weekdaysMin(): Array<string>;
  static months(): string;
  static monthsShort(): string;
  static weekdays(): string;
  static weekdaysShort(): string;
  static weekdaysMin(): string;
  static localeData(key?: string): moment$LocaleData;
  static duration(value: number|Object|string, unit?: string): moment$MomentDuration;
  static isDuration(obj: any): bool;
  static normalizeUnits(unit: string): string;
  static invalid(object: any): moment$Moment;
}

declare module 'moment' {
  declare module.exports: Class<moment$Moment>;
}
