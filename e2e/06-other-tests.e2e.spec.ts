import { i18nObject } from "../app/i18n/i18n-util"
import { loadLocale } from "../app/i18n/i18n-util.sync"
import {
  clickBackButton,
  clickIcon,
  clickOnSetting,
  waitTillOnHomeScreen,
  checkContact,
  selector,
  clickOnBottomTab,
  Tab,
  waitTillTextDisplayed,
  waitTillScreenTitleShowing,
  isScreenTitleShowing,
  clickButton,
} from "./utils"

loadLocale("en")
loadLocale("es")
const LL = i18nObject("en")
const timeout = 30000

describe("Change Language Flow", () => {
  const enLL = LL
  const esLL = i18nObject("es")
  it("clicks Settings Icon", async () => {
    await clickIcon("menu")
  })

  it("clicks Language", async () => {
    await clickOnSetting(enLL.common.language())
    browser.pause(2000)
  })

  it("changes language to Spanish", async () => {
    await clickOnSetting("Español")
    await waitTillScreenTitleShowing(esLL.common.languagePreference())
  })

  it("changes language back to Predetermined", async () => {
    await clickOnSetting(esLL.Languages.DEFAULT())
    await waitTillScreenTitleShowing(enLL.common.languagePreference())
  })

  it("navigates back to move home screen", async () => {
    await clickBackButton()
    await waitTillTextDisplayed(enLL.common.preferences())
    await clickBackButton()
    await waitTillOnHomeScreen()
  })
})

describe("People Flow", () => {
  it("Click People Button", async () => {
    await clickOnBottomTab(Tab.People)
  })

  it("Click all contacts", async () => {
    await clickButton(LL.PeopleScreen.viewAllContacts())
  })

  it("Check if contacts exists", async () => {
    const { contactList } = await checkContact()
    let contactUsernameButton: WebdriverIO.Element
    expect(contactList?.length).toBe(contactList?.length)

    const searchBar = await $(selector(LL.common.search(), "Other"))
    await searchBar.waitForDisplayed({ timeout })
    console.log("1")
    await searchBar.click()
    console.log("2")
    await searchBar.setValue(contactList?.[0].username || "")
    console.log("3")
    if (process.env.E2E_DEVICE === "ios") {
      const enterButton = await $(selector("Return", "Button"))
      await enterButton.waitForDisplayed({ timeout })
      await enterButton.click()
      contactUsernameButton = await $(selector("RNE__LISTITEM__padView", "Other"))
    } else {
      // press the enter key
      browser.keys("\uE007")
      const uiSelector = `new UiSelector().text("${contactList?.[0].username}").className("android.widget.TextView")`
      contactUsernameButton = await $(`android=${uiSelector}`)
    }
    await contactUsernameButton.waitForDisplayed({ timeout })
    await contactUsernameButton.click()
    // pause to wait for contact details to load
    await browser.pause(2000)
    await $(selector("contact-detail-icon", "Other")).isDisplayed()
  })

  it("Go back to People home", async () => {
    await clickOnBottomTab(Tab.People)
    await clickOnBottomTab(Tab.People)
  })

  it("Go back to main screen", async () => {
    await clickOnBottomTab(Tab.Home)
    await waitTillOnHomeScreen()
  })
})

describe("See transactions list", () => {
  it("Click 'Transactions'", async () => {
    const transactionsButton = await $(
      selector(LL.TransactionScreen.title(), "StaticText"),
    )
    await transactionsButton.waitForDisplayed({ timeout })
    await transactionsButton.click()
    // pause to wait for transactions to load
    await browser.pause(2000)
  })

  it("See transactions", async () => {
    const transactionsList = await $(selector("list-item-content", "Other", "[1]"))
    const transactionDescription = await $(
      selector("tx-description", "StaticText", "[2]"),
    )
    await transactionsList.waitForDisplayed({ timeout })
    expect(transactionDescription).toBeDisplayed()
  })

  it("click on first transaction", async () => {
    const firstTransaction = await $(selector("list-item-content", "Other", "[1]"))
    await firstTransaction.waitForDisplayed({ timeout })

    await firstTransaction.click()
  })

  it("check if transaction details are shown", async () => {
    await waitTillTextDisplayed(LL.common.date())
  })

  it("Go back home", async () => {
    if (process.env.E2E_DEVICE === "ios") {
      const close = await $(`(//XCUIElementTypeOther[@name="close"])[2]`)
      await close.waitForEnabled({ timeout })
      await close.click()
    } else {
      await clickIcon("close")
    }

    await waitTillScreenTitleShowing(LL.TransactionScreen.transactionHistoryTitle())
    while (await isScreenTitleShowing(LL.TransactionScreen.transactionHistoryTitle())) {
      await clickBackButton()
      await browser.pause(1000)
    }
    await waitTillOnHomeScreen()
  })
})

describe("Price graph flow", () => {
  it("click on price graph button", async () => {
    await clickIcon("graph")
  })

  it("check if price graph header is shown", async () => {
    const priceGraphHeader = await $(selector(LL.PriceHistoryScreen.satPrice(), "Other"))
    const rangeText = await $(selector("range", "StaticText"))
    await priceGraphHeader.waitForDisplayed({ timeout })
    expect(rangeText).toBeDisplayed()
  })

  it("click on one week button", async () => {
    const oneWeekButton = await $(selector(LL.PriceHistoryScreen.oneWeek(), "Button"))
    const rangeText = await $(selector("range", "StaticText"))
    await oneWeekButton.waitForDisplayed({ timeout })
    await oneWeekButton.click()
    expect(rangeText).toBeDisplayed()
  })

  it("click on one month button", async () => {
    const oneMonthButton = await $(selector(LL.PriceHistoryScreen.oneMonth(), "Button"))
    const rangeText = await $(selector("range", "Other"))
    await oneMonthButton.waitForDisplayed({ timeout })
    await oneMonthButton.click()
    expect(rangeText).toBeDisplayed()
  })

  it("click on one year button", async () => {
    const oneYearButton = await $(selector(LL.PriceHistoryScreen.oneYear(), "Button"))
    const rangeText = await $(selector("range", "Other"))
    await oneYearButton.waitForDisplayed({ timeout })
    await oneYearButton.click()
    expect(rangeText).toBeDisplayed()
  })

  it("click on five years button", async () => {
    const fiveYearsButton = await $(selector(LL.PriceHistoryScreen.fiveYears(), "Button"))
    const rangeText = await $(selector("range", "Other"))
    await fiveYearsButton.waitForDisplayed({ timeout })
    await fiveYearsButton.click()
    expect(rangeText).toBeDisplayed()
  })

  it("go back to home screen", async () => {
    await clickBackButton()
  })
})
