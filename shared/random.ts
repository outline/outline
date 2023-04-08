const randomInteger = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const randomElement = <T>(arr: T[]): T => arr[randomInteger(0, arr.length - 1)];

export { randomInteger, randomElement };
