/* eslint-disable flowtype/require-valid-file-annotation */
import PowerBI from "./PowerBI";

describe("PowerBI", () => {
  const match = PowerBI.ENABLED[0];
  test("to be enabled on dashboard", () => {
    expect(
      "https://app.powerbi.com/view?r=eyJrIjoiMjcxNDIyNjAtOGM0Yi00ZWJhLWJkNmEtNjFiOTI0MWVlYjNiIiwidCI6IjI1NmNiNTA1LTAzOWYtNGZiMi04NWE2LWEzZTgzMzI4NTU3OCIsImMiOjh9".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://powerbi.com".match(match)).toBe(null);
    expect("https://app.powerbi.com".match(match)).toBe(null);
  });
});
