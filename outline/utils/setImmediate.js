export const setImmediate = (callback) => {
	return Promise.resolve().then(callback);
}
