/** How an image is written into sent text: `[Image 1]` is the first of the message's `images`. */
export const imageToken = (number: number) => `[Image ${number}]`;

/** Splits text around markers; the capture group keeps the number. */
export const IMAGE_TOKEN = /\[Image (\d+)\]/g;
