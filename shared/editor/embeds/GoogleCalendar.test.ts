import GoogleCalendar from "./GoogleCalendar";

describe("GoogleCalendar", () => {
  const match = GoogleCalendar.ENABLED[0];

  test("to be enabled on share link", () => {
    expect(
      "https://calendar.google.com/calendar/embed?src=tom%40outline.com&ctz=America%2FSao_Paulo".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://calendar.google.com/calendar".match(match)).toBe(null);
    expect("https://calendar.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://calendarrgoogle.com/calendar/embed?src=tom%40outline.com&ctz=America%2FSao_Paulo".match(
        match
      )
    ).toBe(null);
    expect(
      "https://calendar.googleecom/calendar/embed?src=tom%40outline.com&ctz=America%2FSao_Paulo".match(
        match
      )
    ).toBe(null);
  });
});
