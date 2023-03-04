import { i18nObject } from "../app/i18n/i18n-util"
import { loadLocale } from "../app/i18n/i18n-util.sync"
import { selector, goBack } from "./utils"
import { checkContact, getInvoice } from "./utils/graphql"

loadLocale("en")
const LL = i18nObject("en")
const timeout = 30000

describe("Camera Test Flow", () => {
  it("should open camera", async () => {
    const scanQRButton = await $(selector(LL.ScanningQRCodeScreen.title(), "Other"))
    await scanQRButton.waitForDisplayed({ timeout })
    await scanQRButton.click()
    // we are using try catch because this would only run on first install
    // subsequent runs will not show the alert to allow permissions
    // TODO: find a better way to check if this is the first install
    // that triggers the allow permissions button
    try {
      if (process.env.E2E_DEVICE === "ios") {
        const OKButton = await $(selector("OK", "Button"))
        await OKButton.waitForDisplayed({ timeout: 5000 })
        await OKButton.click()
      }
    } catch (error) {
      // we don't want to fail the test if the allow button is not found
      console.log("Allow permissions button not found")
    }
  })

  it("should get and paste invoice", async () => {
    const invoice = await getInvoice()
    expect(invoice).toContain("lntbs")
    const invoiceBase64 = Buffer.from(invoice, "utf-8").toString("base64")
    let pasteInvoiceButton: WebdriverIO.Element

    if (process.env.E2E_DEVICE === "android") {
      await driver.setClipboard(invoiceBase64, "plaintext")
      pasteInvoiceButton = await $('//*[contains(@content-desc,"paste-invoice-button")]')
      await pasteInvoiceButton.waitForDisplayed({ timeout })
      await pasteInvoiceButton.click()
    } else {
      await driver.setClipboard(invoiceBase64)
      pasteInvoiceButton = await $(selector("paste-invoice-button", "StaticText"))
      await pasteInvoiceButton.waitForDisplayed({ timeout })
      await pasteInvoiceButton.click()
      const allowButton = await $(selector("Allow Paste", "Button"))
      await allowButton.waitForDisplayed({ timeout: 5000 })
      await allowButton.click()
    }
  })

  it("should go back to scan QR", async () => {
    const backButton = await $(goBack())
    await backButton.waitForDisplayed({ timeout })
    await backButton.click()
  })

  it("Close Scan QR code screen and go back to home screen", async () => {
    const closeButton = await $(selector("close-camera-button", "Other"))
    await closeButton.waitForDisplayed({ timeout })
    await closeButton.click()
    await browser.pause(2000)
  })
})

describe("Validate Username Flow", () => {
  const username = "unclesamtoshi"
  const lnAddress = "unclesamtoshi@pay.staging.galoy.io"

  it("Click Send", async () => {
    const sendButton = await $(selector(LL.HomeScreen.send(), "Other"))
    await sendButton.waitForDisplayed({ timeout })
    await sendButton.click()
  })

  it("Paste Username", async () => {
    const usernameInput = await $(selector(LL.SendBitcoinScreen.input(), "Other", "[1]"))
    const nextButton = await $(selector(LL.common.next(), "Button"))
    await usernameInput.waitForDisplayed({ timeout })
    await usernameInput.click()
    await usernameInput.setValue(username)
    await nextButton.waitForDisplayed({ timeout })
    await nextButton.waitForEnabled()
    await nextButton.click()
  })

  it("Confirm Username", async () => {
    const checkBoxButton = await $(
      selector(
        LL.SendBitcoinDestinationScreen.confirmModal.checkBox({ lnAddress }),
        "Other",
      ),
    )
    const confirmButton = await $(
      selector(LL.SendBitcoinDestinationScreen.confirmModal.confirmButton(), "Button"),
    )
    const { isContactAvailable } = await checkContact(username)
    expect(isContactAvailable).toBe(false)

    await checkBoxButton.waitForDisplayed({ timeout })
    await checkBoxButton.click()
    await confirmButton.waitForEnabled({ timeout })
    await confirmButton.click()
  })

  it("Go back to Send Bitcoin Destination Screen", async () => {
    const backHomeButton = await $(goBack())
    await backHomeButton.waitForDisplayed({ timeout })
    await backHomeButton.click()
    await browser.pause(2000)
  })

  it("Go back home", async () => {
    const backHomeButton = await $(goBack())
    await backHomeButton.waitForDisplayed({ timeout })
    await backHomeButton.click()
  })
})

describe("Username Payment Flow", () => {
  const username = "galoytest"

  it("Click Send", async () => {
    const sendButton = await $(selector(LL.HomeScreen.send(), "Other"))
    await sendButton.waitForDisplayed({ timeout })
    await sendButton.click()
  })

  it("Paste Username", async () => {
    const usernameInput = await $(selector(LL.SendBitcoinScreen.input(), "Other", "[1]"))
    await usernameInput.waitForDisplayed({ timeout })
    await usernameInput.click()
    await usernameInput.setValue(username)
  })

  it("Click Next", async () => {
    const { isContactAvailable } = await checkContact(username)
    expect(isContactAvailable).toBeTruthy()
    const nextButton = await $(selector(LL.common.next(), "Button"))
    await nextButton.waitForDisplayed({ timeout })
    await nextButton.waitForEnabled()
    await nextButton.click()
  })

  it("Wallet contains balances", async () => {
    const btcWalletBalanceInUsd = await $(
      selector("BTC Wallet Balance in USD", "StaticText"),
    )
    expect(btcWalletBalanceInUsd).toBeDisplayed()
    const btcWalletBalanceInUsdValue = await btcWalletBalanceInUsd.getText()
    expect(btcWalletBalanceInUsdValue).toHaveText(
      new RegExp("^$(0|[1-9][0-9]{0,2})(,d{3})*(.d{1,2})?$"),
    )
    const btcWalletBalanceInSats = await $(
      selector("BTC Wallet Balance in sats", "StaticText"),
    )
    expect(btcWalletBalanceInSats).toBeDisplayed()
    const btcWalletBalanceInSatsValue = await btcWalletBalanceInSats.getText()
    expect(btcWalletBalanceInSatsValue).toHaveText(new RegExp("^[0-9,]* sats$"))
  })

  it("Add amount", async () => {
    const amountInput = await $(selector("Primary Amount", "TextField"))
    const switchButton = await $(selector("switch-button", "Other"))
    await amountInput.waitForDisplayed({ timeout })
    await amountInput.click()
    await amountInput.setValue("2")
    await switchButton.click()
  })

  it("Click Next again", async () => {
    const nextButton = await $(selector(LL.common.next(), "Button"))
    await nextButton.waitForDisplayed({ timeout })
    await nextButton.waitForEnabled()
    await nextButton.click()
  })

  it("Click 'Confirm Payment' and get Green Checkmark success", async () => {
    const confirmPaymentButton = await $(
      selector(LL.SendBitcoinConfirmationScreen.title(), "Button"),
    )
    await confirmPaymentButton.waitForDisplayed({ timeout })
    await confirmPaymentButton.click()
    const currentBalanceHeader = await $(selector("Current Balance Header", "StaticText"))
    await currentBalanceHeader.waitForDisplayed({ timeout })
  })
})

describe("Conversion Flow", () => {
  it("Click on Transfer Icon", async () => {
    const transferButton = await $(selector("Transfer Icon", "Other"))
    await transferButton.waitForDisplayed({ timeout })
    await transferButton.click()
  })

  it("Click on amount", async () => {
    const amountInput = await $(selector("Primary Input", "Other"))
    const switchButton = await $(selector("switch-button", "Other"))
    await amountInput.waitForDisplayed({ timeout })
    await amountInput.click()
    await amountInput.setValue("2")
    await switchButton.click()
  })

  it("Click Next", async () => {
    const nextButton = await $(selector(LL.common.next(), "Button"))
    await nextButton.waitForDisplayed({ timeout })
    await nextButton.waitForEnabled()
    await nextButton.click()
  })

  it("Click on Convert", async () => {
    const convertButton = await $(selector(LL.common.convert(), "Button"))
    await convertButton.waitForDisplayed({ timeout })
    await convertButton.waitForEnabled()
    await convertButton.click()
  })

  it("Get Green Checkmark Success Icon and Navigate to HomeScreen", async () => {
    const currentBalanceHeader = await $(selector("Current Balance Header", "StaticText"))
    await currentBalanceHeader.waitForDisplayed({ timeout })
  })
})
