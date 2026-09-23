/** DOM ids shared by the page and the sidebar. They double as stepper step keys. */
export const anchors = {
  round: (number: number) => `round-${number}`,
  question: (id: string) => `q-${id}`,
  summary: "summary",
};
