const CHECKBOX_REGEX = /\[(X|\s|_|-)\]\s(.*)?/gi;

export default function getTasks(text: string) {
  const matches = [...text.matchAll(CHECKBOX_REGEX)];
  const total = matches.length;

  if (!total) {
    return {
      completed: 0,
      total: 0,
    };
  } else {
    const notCompleted = matches.reduce(
      (accumulator, match) =>
        match[1] === " " ? accumulator + 1 : accumulator,
      0
    );
    return {
      completed: total - notCompleted,
      total,
    };
  }
}
