import { webkit } from "playwright";

export const playwrightFactory = async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();

  await page.route("**.jpg", (route) => route.abort());
  await page.route("**.png", (route) => route.abort());
  await page.route("**.webp", (route) => route.abort());

  return { browser, page };
};
