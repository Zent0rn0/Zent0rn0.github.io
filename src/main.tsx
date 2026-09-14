import { hydrate, render } from "preact";
import "./index.css";
import App from "./App";
import profile from "../public/profile.json";

if (typeof window !== "undefined") {
  const root = document.getElementById("root")!;
  (root.firstElementChild ? hydrate : render)(<App />, root);
}

// called once at build time by @preact/preset-vite; the renderer is imported lazily so it never ships to the browser
export async function prerender() {
  const { renderToString } = await import("preact-render-to-string");
  return { html: renderToString(<App />), head: { lang: "ru", title: `${profile.name} — личная карточка` } };
}
