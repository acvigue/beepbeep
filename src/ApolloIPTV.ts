import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { config } from "dotenv";
import { webkit } from "playwright";
import { faker } from "@faker-js/faker";
import { TVBestLogin } from "./entity/TVBestLogin";
import { AppDataSource } from "./datasource";
import { getPhoneNumber, getVerificationCodeLoop } from "./apis/TempNumber";
import { generateEmail, getLoginLinkLoop } from "./apis/tempmail";
import { playwrightFactory } from "PlaywrightFactory";

config();

const refreshOrCreate = async (tuner_id: number) => {
  const existingTunerLogin = await AppDataSource.getRepository(
    TVBestLogin
  ).findOne({ where: { tuner_id } });
  if (!existingTunerLogin) {
    console.log(`Creating new login for tuner #${tuner_id}`);
  } else {
    console.log(`Refreshing login for tuner #${tuner_id}`);

    if (existingTunerLogin.expires_at > new Date()) {
      console.log(`Login for tuner #${tuner_id} is still valid, skipping!`);
      return;
    }
  }

  const { browser, page } = await playwrightFactory();
  try {
    await page.goto("https://portal.apollogroup.tv/Register?trial=true");

    const fakeData = {
      password: faker.internet.password(),
      name: {
        first: faker.person
          .firstName("male")
          .substring(0, 10)
          .replace(/[^a-zA-Z0-9]/g, ""),
        last: faker.person
          .lastName("male")
          .substring(0, 10)
          .replace(/[^a-zA-Z0-9]/g, ""),
      },
    };

    const username = faker.internet
      .userName({
        firstName: fakeData.name.first,
        lastName: fakeData.name.last,
      })
      .substring(0, 12)
      .replace(/[^a-zA-Z0-9]/g, "");

    const email = await generateEmail();

    await page.waitForTimeout(2000);
    await page.fill("#input-22", fakeData.name.first);
    await page.fill("#input-27", fakeData.name.last);
    await page.fill("#input-32", email);
    await page.fill("#input-37", username);

    const phoneNumber = await getPhoneNumber();

    if (!phoneNumber) {
      throw new Error("No phone number available");
    }

    await page.fill("input.phone-validator", phoneNumber);
    const ip = faker.internet.ip();
    await page.route("**/sendPhoneVerificationCodeAndCreateLead", (route) => {
      if (route.request().method() !== "POST") {
        route.continue();
        return;
      }

      const body = route.request().postDataJSON();
      body.leadData.ip = ip;
      route.continue({ postData: JSON.stringify(body) });
    });

    await page.route("**/register", (route) => {
      if (route.request().method() !== "POST") {
        route.continue();
        return;
      }

      const body = route.request().postDataJSON();
      body.ip = ip;
      route.continue({ postData: JSON.stringify(body) });
    });

    await page.click("button.v-size--default:nth-child(1)");

    await page.waitForSelector(".verify-sms-btn", { timeout: 10000 });
    await page.waitForTimeout(5000);
    await page.click(".verify-sms-btn", { timeout: 10000 });

    const verificationCode = await getVerificationCodeLoop(phoneNumber);
    await page.fill(".verify-input", verificationCode, { timeout: 100000000 });
    await page.click(".verify-btn");

    await page.waitForTimeout(5000);

    const url = await getLoginLinkLoop(email);
    const u = url.split("/")[5];
    const password = url.split("/")[6];

    const newLogin = new TVBestLogin();
    newLogin.tuner_id = tuner_id;
    newLogin.username = u;
    newLogin.password = password;
    newLogin.expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await AppDataSource.getRepository(TVBestLogin).save(newLogin);
  } catch (e) {
    console.error(e);
  } finally {
    console.log(`Signup complete for tuner #${tuner_id}`);
    await browser.close();
  }
};

const task = new AsyncTask(
  "simple task",
  async () => {
    for (let i = 0; i < parseInt(process.env.MAX_TUNERS ?? "2"); i++) {
      await refreshOrCreate(i);
    }
  },
  (err: Error) => {
    /* handle error here */
  }
);

export const refreshJob = () => {
  task.execute();
  return new SimpleIntervalJob(
    { days: parseInt(process.env.VALIDITY_PERIOD_DAYS ?? "8") },
    task,
    { preventOverrun: true }
  );
};
