import geistMono from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?inline";
import geistSans from "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?inline";

/*
 * The UI's typefaces as data URIs. The visualization frame has an opaque origin and a
 * CSP that allows fonts only from data:, so it can't load the files the app uses.
 * Imported lazily: about 70 KB that only the visualization view needs.
 */
export const FONT_FACES = [
  `@font-face{font-family:"Geist Variable";font-style:normal;font-display:block;font-weight:100 900;src:url(${geistSans}) format("woff2")}`,
  `@font-face{font-family:"Geist Mono Variable";font-style:normal;font-display:block;font-weight:100 900;src:url(${geistMono}) format("woff2")}`,
].join("\n");
