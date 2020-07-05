// @flow
export default function getQueryVariable(variable: string) {
  const query = window.location.search.substring(1);
  const vars = query.split("&");

  for (var i = 0; i < vars.length; i++) {
    const pair = vars[i].split("=");

    if (pair[0] === variable) {
      return pair[1];
    }
  }
}
