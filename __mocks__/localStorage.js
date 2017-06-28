const storage = {};

export default {
  setItem: function(key, value) {
    storage[key] = value || '';
  },
  getItem: function(key) {
    return key in storage ? storage[key] : null;
  },
  removeItem: function(key) {
    delete storage[key];
  },
  get length() {
    return Object.keys(storage).length;
  },
  key: function(i) {
    var keys = Object.keys(storage);
    return keys[i] || null;
  },
};
