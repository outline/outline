export default {
  upload: jest.fn().mockReturnValue("/endpoint/key"),

  getUploadUrl: jest.fn().mockReturnValue("http://mock/create"),

  getUrlForKey: jest.fn().mockReturnValue("http://mock/get"),

  getSignedUrl: jest.fn().mockReturnValue("http://s3mock"),

  getPresignedPost: jest.fn().mockReturnValue({}),
};
