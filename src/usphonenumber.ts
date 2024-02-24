import { webkit } from "playwright";
import { AppDataSource } from "./datasource";
import { PooledPhone } from "./entity/PooledPhone";

export const getPhoneNumber = async () => {
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage();

    // The actual interesting bit
    await page.route("**.jpg", (route) => route.abort());
    await page.goto("https://temp-number.com/countries/United-States");

    const numbers = await page.$$("a.country-link");

    for (const numberLink of numbers) {
      const number = await numberLink.innerText();
      if (number) {
        const formattedNumber = number.substring(1);
        const alreadyUsed = await AppDataSource.getRepository(
          PooledPhone
        ).exists({ where: { phone_number: formattedNumber, used: 1 } });
        if (!alreadyUsed) {
          const internalIdURL = await numberLink.getAttribute("href");
          const internalId = await internalIdURL?.getAttribute("href");

          if (internalId) {
            const internalIdNumber = parseInt(
              internalId.replace("us-phone-number", "").replaceAll("/", "")
            );

            //Create the number if it doesn't exist
            const repo = AppDataSource.getRepository(PooledPhone);
            const exists = await repo.exists({
              where: { phone_number: formattedNumber },
            });
            console.log(`Exists: ${exists}`);
            if (!exists) {
              const newPhone = new PooledPhone();
              newPhone.internal_id = internalIdNumber;
              newPhone.phone_number = formattedNumber;
              await repo.save(newPhone);
            }

            return {
              number: formattedNumber,
              internalId: internalIdNumber,
            };
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
};

export const getVerificationCodeLoop = (internal_id: number) => {
  return new Promise<string>((resolve, reject) => {
    let i = 0;
    const interval = setInterval(async () => {
      try {
        console.log(`Checking for code on ${internal_id}");`);
        const code = await getVerificationCode(internal_id);
        if (code) {
          console.log(`Code found: ${code}`);

          //Mark the number as used
          const repo = AppDataSource.getRepository(PooledPhone);
          const phone = await repo.findOneOrFail({ where: { internal_id } });
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

const getVerificationCode = async (internal_id: number) => {
  const browser = await webkit.launch();
  try {
    const page = await browser.newPage();

    // The actual interesting bit
    await page.route("**.jpg", (route) => route.abort());
    await page.goto(
      `https://www.receivesms.co/us-phone-number/${internal_id}/`
    );

    const tableRows = await page.$$("#msgtbl > div.table-hover");

    for (const tableRow of tableRows) {
      const smsBox = await tableRow.$("div.col-md-8");

      if (!smsBox) {
        console.error("No number box found");
        continue;
      }

      const smsText = await smsBox.innerText();
      const smsRegex =
        /Your Phone verification verification code is: (?<code>[0-9]{6})/g;

      const match = smsRegex.test(smsText);
      if (match) {
        const code = smsText.split("verification code is: ")[1];
        return code;
      }
      return null;
    }
  } finally {
    await browser.close();
  }
};
