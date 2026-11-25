import assert from "node:assert/strict";
import test from "node:test";
import { extractImageUrls } from "./extract";

test("keeps the product photo and drops logos, social cards, and tiny thumbs", () => {
  const html = `
    <meta property="og:image" content="https://dealer.example/uploads/atlas-electric-social.jpg" />
    <img src="https://dealer.example/logo.png" />
    <img src="https://dealer.example/uploads/IMG_0680-150x150.jpg" />
    <img src="https://dealer.example/uploads/IMG_0680.jpg" />
    <img src="https://dealer.example/uploads/IMG_0682.jpg" />
    <script type="application/ld+json">
      {"@type":"Product","image":["https://dealer.example/uploads/IMG_0680.jpg","https://dealer.example/uploads/abb.jpg"]}
    </script>
  `;
  const urls = extractImageUrls(html, "https://dealer.example/product/switchgear");
  assert.deepEqual(urls, ["https://dealer.example/uploads/IMG_0680.jpg"]);
});

test("falls back to the first photo series when the page has no og image", () => {
  const html = `
    <img width="150" src="https://dealer.example/wp-content/uploads/PNW0001_01-150x150.jpg" />
    <img src="https://dealer.example/wp-content/uploads/PNW0001_01.jpg" />
    <img src="https://dealer.example/wp-content/uploads/PNW0001_02.jpg" />
    <img src="https://dealer.example/wp-content/uploads/PNW0011_01.jpg" />
    <img src="https://dealer.example/wp-content/themes/demo/banner.jpg" />
  `;
  assert.deepEqual(extractImageUrls(html, "https://dealer.example/product/genset"), [
    "https://dealer.example/wp-content/uploads/PNW0001_01.jpg",
    "https://dealer.example/wp-content/uploads/PNW0001_02.jpg",
  ]);
});
