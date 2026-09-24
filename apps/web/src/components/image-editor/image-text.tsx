import { Fragment } from "react";
import { imageUrl } from "@/lib/images.ts";
import { ImagePill } from "./image-pill.tsx";
import { IMAGE_TOKEN } from "./tokens.ts";

/**
 * Sent text with its `[Image N]` markers shown as pills (N counts from 1 into `images`).
 * Images the text never mentions follow at the end.
 */
export function ImageText({ text, images = [], tone }: { text: string; images?: string[]; tone?: "default" | "inverse" }) {
  const mentioned = new Set<number>();
  const parts = text.split(IMAGE_TOKEN).map((part, i) => {
    // split() with a capture group: odd parts are the numbers.
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const number = Number(part);
    const id = images[number - 1];
    if (!id) return <Fragment key={i}>{`[Image ${part}]`}</Fragment>;
    mentioned.add(number);
    return <ImagePill key={i} number={number} src={imageUrl(id)} href={imageUrl(id)} tone={tone} />;
  });
  const rest = images.flatMap((id, i) => (mentioned.has(i + 1) ? [] : [{ id, number: i + 1 }]));
  return (
    <>
      {parts}
      {rest.map(({ id, number }) => (
        <Fragment key={id}>
          {" "}
          <ImagePill number={number} src={imageUrl(id)} href={imageUrl(id)} tone={tone} />
        </Fragment>
      ))}
    </>
  );
}
