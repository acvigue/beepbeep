import { AppDataSource } from "../datasource";
import { PooledPhone } from "../entity/PooledPhone";
import { playwrightFactory } from "PlaywrightFactory";
import { getBypassCloudflare } from "./flaresolverr";
import { load } from "cheerio";

export const getPhoneNumber = async () => {
  const data = await getBypassCloudflare(
    "https://temp-number.com/countries/United-States"
  );
  const $ = load(data);

  const numbers = $("a.country-link").toArray();

  for (const numberLink of numbers) {
    const number = $(numberLink).text().trim().substring(1);
    console.log(`Checking number: ${number}`);
    if (number) {
      const alreadyUsed = await AppDataSource.getRepository(PooledPhone).exists(
        { where: { phone_number: number, used: 1 } }
      );
      if (alreadyUsed) {
        continue;
      }

      const repo = AppDataSource.getRepository(PooledPhone);
      const exists = await repo.exists({
        where: { phone_number: number },
      });
      if (!exists) {
        const newPhone = new PooledPhone();
        newPhone.phone_number = number;
        await repo.save(newPhone);
      }

      return number;
    }
  }
};

export const getVerificationCodeLoop = (phoneNumber: string) => {
  return new Promise<string>((resolve, reject) => {
    let i = 0;
    const interval = setInterval(async () => {
      try {
        console.log(`Checking for code on ${phoneNumber}`);
        const code = await getVerificationCode(phoneNumber);
        if (code) {
          console.log(`Code found: ${code}`);

          //Mark the number as used
          const repo = AppDataSource.getRepository(PooledPhone);
          const phone = await repo.findOneOrFail({
            where: { phone_number: phoneNumber },
          });
          phone.used = 1;
          await repo.save(phone);

          clearInterval(interval);
          resolve(code);
        } else {
          console.log("No code found");
          i++;

          if (i > 10) {
            clearInterval(interval);
            reject("No code found after 10 attempts");
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 10000);
  });
};

const getVerificationCode = async (phoneNumber: string) => {
  const data = await getBypassCloudflare(
    `https://temp-number.com/temporary-numbers/United-States/1${phoneNumber}/1`
  );
  const $ = load(data);
  const messages = $(".direct-chat-text").toArray();

  const regex =
    /Your Phone verification verification code is: (?<code>[0-9]{6})/g;
  for (const message of messages) {
    const text = await $(message).text().trim();
    console.log(text);

    const match = regex.test(text);
    if (match) {
      const code = text.split("verification code is: ")[1];
      return code;
    }
  }
};
