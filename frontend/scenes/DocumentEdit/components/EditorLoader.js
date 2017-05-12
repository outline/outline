// @flow
export default () => {
  return new Promise(resolve => {
    // $FlowIssue this is available with webpack
    require.ensure([], () => {
      resolve({
        Editor: require('./Editor').default,
      });
    });
  });
};
