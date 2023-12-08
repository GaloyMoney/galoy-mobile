import { gql } from "@apollo/client"
import { useWarningSecureAccountQuery } from "@app/graphql/generated"
import { useIsAuthed } from "@app/graphql/is-authed-context"
import { getBtcWallet, getUsdWallet } from "@app/graphql/wallets-utils"
import { usePriceConversion } from "@app/hooks"
import {
  ZeroUsdMoneyAmount,
  addMoneyAmounts,
  greaterThanOrEqualTo,
  toBtcMoneyAmount,
  toUsdMoneyAmount,
} from "@app/types/amounts"

gql`
  query warningSecureAccount {
    me {
      id
      defaultAccount {
        level
        id
        wallets {
          id
          balance
          walletCurrency
        }
      }
    }
  }
`

const minimumBalance = 500 // $5

export const useShowWarningSecureAccount = () => {
  const { convertMoneyAmount } = usePriceConversion()
  const isAuthed = useIsAuthed()

  const { data } = useWarningSecureAccountQuery({
    fetchPolicy: "cache-and-network",
    skip: !isAuthed,
  })

  if (data?.me?.defaultAccount?.level !== "ZERO") return false

  const btcWallet = getBtcWallet(data?.me?.defaultAccount?.wallets)
  const usdWallet = getUsdWallet(data?.me?.defaultAccount?.wallets)

  const usdMoneyAmount = toUsdMoneyAmount(usdWallet?.balance)

  const btcMoneyAmount = toBtcMoneyAmount(btcWallet?.balance)

  const btcBalanceInUsd =
    (convertMoneyAmount && convertMoneyAmount(btcMoneyAmount, "USD")) ||
    ZeroUsdMoneyAmount

  const totalBalanceUsd = addMoneyAmounts({
    a: btcBalanceInUsd,
    b: usdMoneyAmount,
  })

  return greaterThanOrEqualTo({
    value: totalBalanceUsd,
    greaterThanOrEqualTo: toUsdMoneyAmount(minimumBalance),
  })
}
