/* eslint-disable flowtype/require-valid-file-annotation */
import Giphy from "./Giphy";

describe("Giphy", () => {
    const match = Giphy.ENABLED[0];
    test("to be enabled on share link", () => {
        expect(
            "https://giphy.com/gifs/southparkgifs-3o6ZsYqMZVnZ4Aigo0".match(match)
        ).toBeTruthy();
    });

    test("to not be enabled elsewhere", () => {
        expect("https://giphy.com/gifs".match(match)).toBe(null);
        expect("https://giphy.com/".match(match)).toBe(null);
    });
});