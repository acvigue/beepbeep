import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { AppDataSource } from "./datasource";
import { ToadScheduler } from "toad-scheduler";
import { refreshJob } from "./ApolloIPTV";
import { TVBestLogin } from "./entity/TVBestLogin";
import { config } from "dotenv";
import { MoreThan, MoreThanOrEqual } from "typeorm";

config();
const app = new Hono();
const scheduler = new ToadScheduler();
let concurrentStream = 0;

app.post("/webhook", async (c) => {
  const body = await c.req.parseBody();
  const payload = JSON.parse(body.payload as string);

  const event = payload.event;

  if (event === "media.play" && payload.Metadata.live === 1) {
    console.log("Live TV playing");
    concurrentStream++;
  } else if (event === "media.stop" && payload.Metadata.live === 1) {
    console.log("Live TV stopped");
    concurrentStream--;
    if (concurrentStream < 0) {
      concurrentStream = 0;
    }
  }
  console.log(`Concurrent streams: ${concurrentStream}`);
  return c.json({ success: true });
});

app.get("/channels", async (c) => {
  const repo = AppDataSource.getRepository(TVBestLogin);
  const logins = await repo.findOneOrFail({
    where: { expires_at: MoreThan(new Date()) },
  });

  if (!logins) {
    return c.text("No logins found", 500);
  }

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
  const repo = AppDataSource.getRepository(TVBestLogin);
  const logins = await repo.findOneOrFail({
    where: {
      tuner_id: MoreThanOrEqual(concurrentStream),
      expires_at: MoreThan(new Date()),
    },
  });
  if (!logins) {
    return c.text("No logins found", 500);
  }

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
