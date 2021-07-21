// @flow

const TICKED_CHECKBOX_REGEX = /\[(x)\]\s/g;
const CHECKBOX_REGEX = /\[(x|\s|)\]\s/g;

export default function getTasks(text: string) {
  let total = (text.match(CHECKBOX_REGEX) || []).length;
  if (!total) {
    return {
      completed: 0,
      total: 0,
    };
  } else {
    let completed = (text.match(TICKED_CHECKBOX_REGEX) || []).length;
    return { completed, total };
  }
}
