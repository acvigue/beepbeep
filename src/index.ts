import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { webkit } from "playwright";
import { AppDataSource } from "./datasource";
import { ToadScheduler } from "toad-scheduler";
import { refreshJob } from "./apollogroup-tv";
import { TVBestLogin } from "./entity/TVBestLogin";
import { config } from "dotenv";
import { parse } from "iptv-playlist-parser";

config();
const app = new Hono();
const scheduler = new ToadScheduler();

app.get("/channels", async (c) => {
  const repo = AppDataSource.getRepository(TVBestLogin);
  const logins = await repo.findOneOrFail({ where: { tuner_id: 0 } });
  const url = `https://tvnow.best/api/list/${logins.username}/${logins.password}`;
  const resp = await fetch(url);
  const respText = await resp.text();

  const internalURL = process.env.EXTERNAL_STREAM_ACCESS ?? "";

  const filteredRespText = respText.replaceAll(
    `https://tvnow.best/api/stream/${logins.username}/${logins.password}/livetv.epg/`,
    `${internalURL}/stream/`
  );
  return c.text(filteredRespText);
});

app.get("/stream/:id", async (c) => {
  const channel_id = c.req.param("id");
  const currentStreams = 0;
  const repo = AppDataSource.getRepository(TVBestLogin);
  const logins = await repo.findOneOrFail({
    where: { tuner_id: currentStreams },
  });
  const url = `https://tvnow.best/api/stream/${logins.username}/${logins.password}/livetv.epg/${channel_id}`;
  return c.redirect(url);
});

AppDataSource.initialize().then(() => {
  console.log("Database initialized");
  const port = 3000;
  console.log(`Server is running on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });

  scheduler.addSimpleIntervalJob(refreshJob());
});
