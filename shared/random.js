// @flow
const randomInteger = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const randomString = (min: number, max: number) => {
  return Math.random().toString(36).substr(min, max);
}

export { randomInteger, randomString };
