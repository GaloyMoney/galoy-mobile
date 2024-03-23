import { i18nObject } from "../app/i18n/i18n-util"
import { loadLocale } from "../app/i18n/i18n-util.sync"
import { getAccessTokenFromClipboard } from "./helpers"
import {
  clickBackButton,
  clickIcon,
  clickOnSetting,
  selector,
  scrollDown,
  clickButton,
  waitTillButtonDisplayed,
  getInbox,
  getFirstEmail,
  getSecondEmail,
  clickAlertLastButton,
  sleep,
  waitTillTextDisplayed,
} from "./utils"

describe("Login Flow", () => {
  loadLocale("en")
  const LL = i18nObject("en")
  const timeout = 30000
  let email = ""
  let inboxId = ""

  it("clicks Settings Icon", async () => {
    await clickIcon("menu")
  })

  it("are we logged in?", async () => {
    await clickOnSetting(LL.common.account())
    await waitTillTextDisplayed(LL.AccountScreen.accountId())
  })

  it("adding an email", async () => {
    await clickOnSetting(LL.AccountScreen.tapToAddEmail())

    const inboxRes = await getInbox()
    if (!inboxRes) throw new Error("No inbox response")
    inboxId = inboxRes.id
    email = inboxRes.emailAddress

    const emailInput = await $(
      selector(LL.EmailRegistrationInitiateScreen.placeholder(), "Other", "[1]"),
    )

    await emailInput.waitForDisplayed({ timeout })
    await emailInput.setValue(email)
    await clickButton(LL.EmailRegistrationInitiateScreen.send())
  })

  it("verifying email", async () => {
    const emailRes = await getFirstEmail(inboxId)
    if (!emailRes) throw new Error("No email response")

    const { subject, body } = emailRes
    expect(subject).toEqual("your code")

    const regex = /\b\d{6}\b/
    const match = body.match(regex)
    if (!match) throw new Error("No code found in email body")
    const code = match[0]

    const placeholder = "000000"
    const codeInput = await $(selector(placeholder, "Other", "[1]"))
    await codeInput.waitForDisplayed({ timeout })
    await codeInput.click()
    await codeInput.setValue(code)

    clickAlertLastButton(LL.common.ok())
  })

  it("log out", async () => {
    await waitTillTextDisplayed(LL.AccountScreen.accountId())
    await scrollDown()
    await clickButton(LL.AccountScreen.logOutAndDeleteLocalData(), true)

    clickAlertLastButton(LL.AccountScreen.IUnderstand())
    await sleep(2000)
    clickAlertLastButton(LL.common.ok())
  })

  it("set staging environment again", async () => {
    const buildButton = await $(selector("logo-button", "Other"))
    await buildButton.waitForDisplayed({ timeout })
    await buildButton.click()
    await browser.pause(100)
    await buildButton.click()
    await browser.pause(100)
    await buildButton.click()
    await browser.pause(100)

    // scroll down for small screens
    await waitTillButtonDisplayed("logout button")
    await scrollDown()

    await clickButton("Staging Button", false)
    await clickButton("Save Changes", false)

    await clickBackButton()
  })

  it("log back in", async () => {
    const emailLink = await $(selector("email-button", "Other"))
    await emailLink.waitForDisplayed({ timeout })
    await emailLink.click()

    const emailInput = await $(
      selector(LL.EmailRegistrationInitiateScreen.placeholder(), "Other", "[1]"),
    )
    await emailInput.waitForDisplayed({ timeout })
    await emailInput.click()
    await emailInput.setValue(email)
    await clickButton(LL.EmailRegistrationInitiateScreen.send())

    const emailRes = await getSecondEmail(inboxId)
    if (!emailRes) throw new Error("No email response")

    const { subject, body } = emailRes
    expect(subject).toEqual("your code")

    const regex = /\b\d{6}\b/
    const match = body.match(regex)
    if (!match) throw new Error("No code found in email body")
    const code = match[0]

    const placeholder = "000000"
    const codeInput = await $(selector(placeholder, "Other", "[1]"))
    await codeInput.waitForDisplayed({ timeout })
    await codeInput.click()
    await codeInput.setValue(code)
  })

  it("Get the new access token from clipboard", async () => {
    await getAccessTokenFromClipboard(LL)
  })
})
