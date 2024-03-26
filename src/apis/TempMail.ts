import { v4 } from "uuid";
import { config } from "dotenv";
import { md5 } from "hono/utils/crypto";
import { createHash } from "crypto";

config();

export const generateEmail = async () => {
  const uuid = v4().substring(0, 8);

  const url = "https://privatix-temp-mail-v1.p.rapidapi.com/request/domains/";
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "",
      "X-RapidAPI-Host": "privatix-temp-mail-v1.p.rapidapi.com",
    },
  };

  const result = await fetch(url, options);
  const data = await result.json();
  const domain = data[0];
  const email = `${uuid}${domain}`;
  return email;
};

const getLoginLink = async (email: string): Promise<string | null> => {
  const hash = createHash("md5").update(email).digest("hex");
  const url = `https://privatix-temp-mail-v1.p.rapidapi.com/request/mail/id/${hash}/`;
  const options = {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY ?? "",
      "X-RapidAPI-Host": "privatix-temp-mail-v1.p.rapidapi.com",
    },
  };

  const result = await fetch(url, options);
  const data = await result.json();
  if (data.error) {
    return null;
  } else {
    const mailText = data[0].mail_text;
    const urls = new RegExp(
      "(^|[ \t\r\n])((ftp|http|https|gopher|mailto|news|nntp|telnet|wais|file|prospero|aim|webcal):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){2,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))",
      "g"
    );
    const urlsArray = mailText.match(urls);
    for (const url of urlsArray) {
      if (url.includes("tvnow.best")) {
        return url;
      }
    }
    throw new Error("No TVBest link found");
  }
};

export const getLoginLinkLoop = async (email: string): Promise<string> => {
  return new Promise<string>(async (resolve, reject) => {
    let i = 0;
    const interval = setInterval(async () => {
      if (i > 10) {
        clearInterval(interval);
        reject("No email found after 10 attempts");
      }
      const url = await getLoginLink(email);
      if (url) {
        console.log(`Email found: ${url}`);
        clearInterval(interval);
        resolve(url);
      } else {
        console.log("No email found");
      }
      i++;
    }, 10000);
  });
};
