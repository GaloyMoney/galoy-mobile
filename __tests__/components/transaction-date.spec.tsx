import { render } from "@testing-library/react-native"
import * as React from "react"

import { TransactionDate } from "../../app/components/transaction-date"
import {
  Transaction,
  TxDirection,
  TxStatus,
  WalletCurrency,
  InitiationVia,
  SettlementVia,
  PriceOfOneSettlementMinorUnitInDisplayMinorUnit,
} from "../../app/graphql/generated"
import { i18nObject } from "../../app/i18n/i18n-util"

jest.mock("@app/i18n/i18n-react", () => ({
  useI18nContext: () => {
    return i18nObject("en")
  },
}))

// Assuming TxDirection, InitiationVia, WalletCurrency, SettlementVia, TxStatus are enums or specific string types
const createMockTransaction = (
  partialTransaction: Partial<Transaction>,
): Transaction => ({
  __typename: "Transaction",
  createdAt: new Date().getTime(),
  date: "mockDate",
  direction: TxDirection.Receive, // Replace with a valid value from TxDirection
  id: "mockId",
  initiationVia: "InitiationVia" as unknown as InitiationVia,
  isReceive: false,
  memo: "mockMemo",
  settlementAmount: 0, // Replace with a valid number
  settlementCurrency: WalletCurrency.Btc, // Replace with a valid value from WalletCurrency
  settlementDisplayAmount: "mockSettlementDisplayAmount",
  settlementDisplayCurrency: "mockSettlementDisplayCurrency",
  settlementDisplayFee: "mockSettlementDisplayFee",
  settlementFee: 0, // Replace with a valid number
  settlementPrice: "price" as unknown as PriceOfOneSettlementMinorUnitInDisplayMinorUnit, // Replace with a valid object of type PriceOfOneSettlementMinorUnitInDisplayMinorUnit
  settlementVia: "SettlementVia" as unknown as SettlementVia, // Replace with a valid value from SettlementVia
  status: TxStatus.Failure, // Replace with a valid value from TxStatus
  text: "mockText",
  ...partialTransaction,
})

describe("Display the createdAt date for a transaction", () => {
  it("Displays pending for a pending onchain transaction", () => {
    const mockedTransaction = createMockTransaction({
      status: "PENDING",
      createdAt: new Date().getDate(),
    })

    const { queryAllByText } = render(
      <TransactionDate
        status={mockedTransaction.status}
        createdAt={mockedTransaction.createdAt}
      />,
    )
    expect(queryAllByText("pending")).not.toBeNull()
  })

  it("Displays friendly date", () => {
    const testTransactionCreatedAtDate = new Date()
    testTransactionCreatedAtDate.setDate(testTransactionCreatedAtDate.getDate() - 1)
    const mockedTransaction = createMockTransaction({
      createdAt: Math.floor(testTransactionCreatedAtDate.getTime() / 1000),
    })

    const { queryByText } = render(
      <TransactionDate
        status={mockedTransaction.status}
        createdAt={mockedTransaction.createdAt}
        diffDate={true}
      />,
    )

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
    const durationInSeconds = Math.max(
      0,
      Math.floor((Date.now() - mockedTransaction.createdAt * 1000) / 1000),
    )

    let duration = ""
    if (durationInSeconds < 60) {
      duration = rtf.format(-durationInSeconds, "second")
    } else if (durationInSeconds < 3600) {
      duration = rtf.format(-Math.floor(durationInSeconds / 60), "minute")
    } else if (durationInSeconds < 86400) {
      duration = rtf.format(-Math.floor(durationInSeconds / 3600), "hour")
    } else if (durationInSeconds < 2592000) {
      // 30 days
      duration = rtf.format(-Math.floor(durationInSeconds / 86400), "day")
    } else if (durationInSeconds < 31536000) {
      // 365 days
      duration = rtf.format(-Math.floor(durationInSeconds / 2592000), "month")
    } else {
      duration = rtf.format(-Math.floor(durationInSeconds / 31536000), "year")
    }

    expect(queryByText(duration)).not.toBeNull()
  })
})
