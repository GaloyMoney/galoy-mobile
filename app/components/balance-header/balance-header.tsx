import * as React from "react"
import { View, StyleSheet } from "react-native"
import { Text } from "../text"
import { color } from "../../theme"

import currency from "currency.js"
import { inject, observer } from "mobx-react"
import { AccountType, CurrencyType } from "../../utils/enum"

import ContentLoader, { Rect } from "react-content-loader/native"

const styles = StyleSheet.create({
  amount: {
    alignItems: "center",
    flexDirection: "column",
    height: 42, // FIXME should be dynamic?
  },

  balanceText: {
    color: color.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 20,
  },

  container: {
    flex: 1,
  },

  header: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 48,
  },
})

const TextCurrency = ({ amount, currencyUsed, fontSize }) => {
  if (currencyUsed === CurrencyType.USD) {
    return (
      <Text style={{ fontSize, color: color.text }}>
        {currency(amount, { formatWithSymbol: true }).format()}
      </Text>
    )
  } /* if (currency === CurrencyType.BTC) */ else {
    return (
      <>
        <Text style={{ fontSize, color: color.text }}>
          {currency(amount, { precision: 0, separator: "," }).format()}
        </Text>
        <Text style={{ fontSize: fontSize / 2, color: color.text }}> sats</Text>
      </>
    )
  }
}

export interface BalanceHeaderProps {
  headingCurrency: CurrencyType
  accountsToAdd: AccountType
  dataStore?: any
  initialLoading: boolean
}

const Loader = () => (
  <ContentLoader 
    height={50}
    width={120}
    speed={2}
    primaryColor="#f3f3f3"
    secondaryColor="#ecebeb"
  >
    <Rect x="0" y="0" rx="4" ry="4" width="120" height="20" /> 
    <Rect x="30" y="35" rx="4" ry="4" width="60" height="10" /> 
  </ContentLoader>
)

export const BalanceHeader: React.FunctionComponent<BalanceHeaderProps> = inject("dataStore")(
  observer(({ headingCurrency, dataStore, accountsToAdd, initialLoading }) => {
    let subCurrency
    if (headingCurrency === CurrencyType.BTC) {
      subCurrency = (
        <TextCurrency
          amount={dataStore.balances({
            currency: CurrencyType.USD,
            account: accountsToAdd,
          })}
          currencyUsed={CurrencyType.USD}
          fontSize={16}
        />
      )
    }

    return (
      <View style={styles.header}>
        <View style={styles.amount}>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            {initialLoading && 
              <Loader />
            }
            {!initialLoading && 
              <TextCurrency
                amount={dataStore.balances({
                  currency: headingCurrency,
                  account: accountsToAdd,
                })}
                currencyUsed={headingCurrency}
                fontSize={32}
              />
            }
          </View>
          {!initialLoading && 
            subCurrency
          }
        </View>
        <Text style={styles.balanceText}>Current Balance</Text>
      </View>
    )
  }),
)
