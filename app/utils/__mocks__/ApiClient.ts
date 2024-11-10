/* eslint-disable */
export const client =  {
  post: jest.fn(() => Promise.resolve({
    data: {
      user: {},
      team: {},
      groups: [],
      groupUsers: [],
    }
  }))
};
