/* eslint-disable flowtype/require-valid-file-annotation */

export const uploadToS3FromBuffer = jest.fn().mockReturnValue("/endpoint/key");

export const publicS3Endpoint = jest.fn().mockReturnValue("http://mock");
