import keyMirror from 'fbjs/lib/keyMirror';

// Constant KEYS 🔑
const keys = keyMirror({
  JWT_STORE_KEY: null, // localStorage key for JWT
});

// Constant values
const constants = {
  API_USER_AGENT: `Atlas`,
  API_BASE_URL: 'http://localhost:3000/api',
};

export default Object.assign(keys, constants);
