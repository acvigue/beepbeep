import { webkit } from "playwright";
import { config } from "dotenv";
config();

export const playwrightFactory = async () => {
  const browser = await webkit.launch({
    headless: process.env.HEADED ? false : true,
  });
  const page = await browser.newPage();

  await page.route("**.jpg", (route) => route.abort());
  await page.route("**.png", (route) => route.abort());
  await page.route("**.webp", (route) => route.abort());

  return { browser, page };
};
