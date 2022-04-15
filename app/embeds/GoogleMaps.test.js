/* eslint-disable flowtype/require-valid-file-annotation */
import GoogleMaps from "./GoogleMaps";

describe("GoogleMaps", () => {
    const match = GoogleMaps.ENABLED[0];
    test("to be enabled on share link", () => {
        expect(
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d120048.59390325504!2d-44.034090052882746!3d-19.90254118382057!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xa690cacacf2c33%3A0x5b35795e3ad23997!2sBelo%20Horizonte%2C%20State%20of%20Minas%20Gerais!5e0!3m2!1sen!2sbr!4v1623165628409!5m2!1sen!2sbr".match(
                match
            )
        ).toBeTruthy();
    });

    test("to not be enabled elsewhere", () => {
        expect("https://www.google.com/maps/".match(match)).toBe(null);
        expect("https://www.google.com/".match(match)).toBe(null);
    });
});