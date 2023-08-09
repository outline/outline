import GoogleMaps from "./GoogleMaps";

describe("GoogleMaps", () => {
  const match = GoogleMaps.ENABLED[0];

  test("to be enabled", () => {
    expect(
      '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d50977.036904273686!2d174.74383592605594!3d-37.00825027293197!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6d0d4fe87ef3d5bb%3A0xf00ef62249b7130!2sAuckland%20Airport!5e0!3m2!1sen!2snz!4v1691573100204!5m2!1sen!2snz" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'.match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      '<iframe src="https://goo.gl/maps/xUx3UAWb1zGZZsLH6" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'.match(
        match
      )
    ).toBe(null);
    expect("https://goo.gl/maps/xUx3UAWb1zGZZsLH6".match(match)).toBe(null);
  });
});
