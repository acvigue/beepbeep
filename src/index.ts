import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "dotenv";

config();
const app = new Hono();

app.get("/vehicle_data/:vehicle_id", async (c) => {
  const { vehicle_id } = c.req.param();

  const query = c.req.query();
  const headers = c.req.raw.headers;

  const encodedQuery = new URLSearchParams(query).toString();

  try {
    const realResult = await fetch(
      `https://owner-api.teslamotors.com/api/1/vehicles/${vehicle_id}/vehicle_data?${encodedQuery}`,
      {
        method: "GET",
        headers,
      }
    );

    const result = await realResult.json();

    if (
      result.response.state == "online" &&
      result.response.vin == process.env.VIN
    ) {
      result.response.drive_state.speed = Math.min(
        result.response.drive_state.speed,
        78
      );

      const { vehicle_data, ...response } = result.response;
      const newResult = { response };
      return c.json(newResult, 200);
    }

    return c.json(result, 200);
  } catch (e) {
    return c.json({ error: "Service Unavailable" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3001,
});
