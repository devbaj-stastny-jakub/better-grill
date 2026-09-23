/** DOM ids shared by the page and the sidebar. */
export const anchors = {
  round: (number: number) => `round-${number}`,
  question: (id: string) => `q-${id}`,
  summary: "summary",
};

export function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
