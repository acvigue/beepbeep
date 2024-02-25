import { config } from "dotenv";
config();

export const getBypassCloudflare = async (
  request_url: string
): Promise<string> => {
  const url = `${process.env.FLARESOLVERR_ROOT}/v1`;
  const requestData = {
    cmd: "request.get",
    url: request_url,
    maxTimeout: 60000,
  };
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  };

  const response = await fetch(url, options);
  const data = await response.json();
  return data.solution.response;
};
