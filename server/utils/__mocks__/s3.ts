export const uploadToS3 = jest.fn().mockReturnValue("/endpoint/key");

export const publicS3Endpoint = jest.fn().mockReturnValue("http://mock");

export const getSignedUrl = jest.fn().mockReturnValue("http://s3mock");

export const getSignedUrlPromise = jest.fn().mockResolvedValue("http://s3mock");

export const getPresignedPost = jest.fn().mockReturnValue({});
