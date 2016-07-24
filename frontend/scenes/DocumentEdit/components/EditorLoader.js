export default () => {
  return new Promise(resolve => {
    require.ensure([], () => {
      resolve({
        Editor: require('./Editor').default,
      });
    });
  });
};
