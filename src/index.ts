import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { webkit } from "playwright";
import { AppDataSource } from "./datasource";

const app = new Hono();

app.get("/live", async (c) => {
  const browser = await webkit.launch();
  const page = await browser.newPage();

  // The actual interesting bit
  await page.route("**.jpg", (route) => route.abort());
  await page.goto("https://google.com/");

  const pageTitle = await page.title();

  // Teardown
  await browser.close();
  return c.text(pageTitle);
});

AppDataSource.initialize().then(() => {
  console.log("Database initialized");
  const port = 3000;
  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });
});
