export default {
  upload: jest.fn().mockReturnValue("/endpoint/key"),

  getPublicEndpoint: jest.fn().mockReturnValue("http://mock"),

  getSignedUrl: jest.fn().mockReturnValue("http://s3mock"),

  getPresignedPost: jest.fn().mockReturnValue({}),
};
