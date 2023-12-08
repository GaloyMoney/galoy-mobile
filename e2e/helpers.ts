import { TranslationFunctions } from "@app/i18n/i18n-types"

import {
  clickAlertLastButton,
  clickBackButton,
  clickButton,
  clickIcon,
  scrollDown,
  selector,
  setUserToken,
  sleep,
  timeout,
  waitTillTextDisplayed,
} from "./utils"

export const getAccessTokenFromClipboard = async (LL: TranslationFunctions) => {
  await clickIcon("menu")

  if (process.env.E2E_DEVICE === "ios") {
    await waitTillTextDisplayed(LL.common.preferences())
  } else {
    await sleep(1000)
  }

  await scrollDown()

  const buildButton = await $(selector("Version Build Text", "StaticText"))
  await buildButton.waitForDisplayed({ timeout })
  await buildButton.click()
  await browser.pause(100)
  await buildButton.click()
  await browser.pause(100)
  await buildButton.click()
  await browser.pause(100)

  await scrollDown()
  await browser.pause(200)
  await scrollDown()

  let token = ""

  if (process.env.E2E_DEVICE === "ios") {
    // on ios, get invoice from share link because copy does not
    // work on physical device for security reasons
    await clickButton("Share access token")

    const accessTokenSharedScreen = await $('//*[contains(@name,"ory_st")]')
    await accessTokenSharedScreen.waitForDisplayed({
      timeout: 8000,
    })
    token = await accessTokenSharedScreen.getAttribute("name")
    await clickButton("Close")
  } else {
    // get from clipboard in android
    await clickButton("Copy access token")
    await browser.pause(200)
    const tokenBase64 = await browser.getClipboard()
    token = Buffer.from(tokenBase64, "base64").toString()
  }

  expect(token).not.toBe("")
  setUserToken(token)

  if (process.env.E2E_DEVICE === "android") {
    await browser.pause(100)
    await clickAlertLastButton(LL.common.ok())
    await browser.pause(100)
  }

  await clickBackButton()
  await browser.pause(100)
  await clickBackButton()
}
