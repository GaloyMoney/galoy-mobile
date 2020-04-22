import auth from "@react-native-firebase/auth"
import functions from "@react-native-firebase/functions"
import { difference } from "lodash"
import { flow, getParentOfType, Instance, SnapshotOut, types } from "mobx-state-tree"
import { IAddInvoiceRequest, IBuyRequest, IPayInvoice, IQuoteRequest, IQuoteResponse, Onboarding, OnboardingRewards, Side } from "../../../../common/types"
import { parseDate } from "../../utils/date"
import { AccountType, CurrencyType } from "../../utils/enum"

export const FiatTransactionModel = types.model("Transaction", {
  name: types.string,
  icon: types.string,
  amount: types.number,
  date: types.number, // TODO: move to timestamp
  cashback: types.maybe(types.number),
})

// should map ILightningTransaction
export const LightningInvoiceModel = types.model("LightningTransaction", {
  amount: types.number,
  description: types.maybe(types.union(types.string, types.null)),

  created_at: types.string, // FIXME
  // date: types.number, // TODO: move to timestamp

  hash: types.string,
  preimage: types.maybe(types.string),
  destination: types.maybe(types.string),
  type: types.string

  // name: types.string,
  // icon: types.string,
})

export const BaseAccountModel = types
  .model("Account", {
    confirmedBalance: NaN,
    unconfirmedBalance: 0,
    type: types.enumeration<AccountType>("Account Type", Object.values(AccountType)),
  })
  .views((self) => ({
    get balance() {
      return self.confirmedBalance + self.unconfirmedBalance
    },
    get transactions() {
      throw new Error("this is an abstract method, need to be implemented in subclass")
    },
  }))

export const QuoteModel = types
  .model("Quote", {
    side: types.union(types.literal("buy"), types.literal("sell")), // Side,
    satPrice: types.maybe(types.number),
    validUntil: types.maybe(types.number), // probably not needed (could be a state in component)
    satAmount: types.maybe(types.number), // probably not needed (could be a state in component)
    signature: types.maybe(types.string),
    invoice: types.maybe(types.string),
  })
  .actions((self) => ({
    reset() {
      // TODO there must be better way to do this
      self.satAmount = self.satPrice = self.validUntil = NaN
      self.signature = self.invoice = undefined
    },
  }))

export const ExchangeModel = types
  .model("Exchange", {
    quote: types.optional(QuoteModel, { side: "buy" }),
  })
  .actions((self) => {
    const assertTrade = (side: Side): void /* success */ => {
      if (self.quote.side !== side) {
        throw new Error(`trying to ${side} but quote is for ${self.quote.side}`)
      }

      const now = Date.now() / 1000
      if (now > self.quote.validUntil) {
        throw new Error(
          `quote ${self.quote.validUntil} has expired, now is ${now}. ` + `Ask for for a new quote`,
        )
      }
    }

    return {
      quoteLNDBTC: flow(function* ({ side, satAmount }) {
        const request: IQuoteRequest = { side }

        if (side === "sell") {
          request.satAmount = satAmount
        } else if (side === "buy") {
          const invoice = yield getParentOfType(self, DataStoreModel).lnd.addInvoice({
            value: satAmount,
            memo: "Buy BTC",
            expiry: 30, // seconds
          })
          request.invoice = invoice.paymentRequest
        }

        const {data} = yield functions().httpsCallable("quoteLNDBTC")(request)

        // @ts-ignore FIXME not sure why but it seems necessary. it seems typescript doesn't get maybe?
        self.quote = data as IQuoteResponse

        const invoiceJson = yield getParentOfType(self, DataStoreModel).lnd.decodePayReq(
          self.quote.invoice,
        )
        console.tron.log(invoiceJson)

        if (side === "sell") {
          self.quote.satPrice = parseFloat(JSON.parse(invoiceJson.description).satPrice)
        }

        self.quote.satAmount = invoiceJson.numSatoshis
        self.quote.validUntil = invoiceJson.timestamp + invoiceJson.expiry
      }),

      buyLNDBTC: flow(function* () {
        try {
          assertTrade("buy")

          const request: IBuyRequest = {
            //@ts-ignore
            side: self.quote.side,
            invoice: self.quote.invoice,
            satPrice: self.quote.satPrice,
            signature: self.quote.signature,
          }

          const result = yield functions().httpsCallable("buyLNDBTC")(request)
          console.tron.log("result BuyLNDBTC", result)
          return result?.data?.success ?? false
        } catch (err) {
          console.tron.error(err.toString(), Error.captureStackTrace(err))
          throw err
        }
      }),

      sellLNDBTC: flow(function* () {
        try {
          assertTrade("sell")
          console.tron.log(self.quote.invoice)

          const result = yield getParentOfType(self, DataStoreModel).lnd.payInvoice({
            paymentRequest: self.quote.invoice,
          })
          console.tron.log("result SellLNDBTC", result)
          return result
        } catch (err) {
          console.tron.error(err.toString(), Error.captureStackTrace(err))
          throw err
        }
      }),
    }
  })

export const FiatAccountModel = BaseAccountModel.props({
  type: AccountType.Bank,
  _transactions: types.array(FiatTransactionModel),
})
  .actions((self) => {
    const updateTransactions = flow(function* () {
      let uid
      try {
        uid = auth().currentUser.uid
      } catch (err) {
        console.tron.log("can't get auth().currentUser.uid", err)
      }
      try {
        // TODO show transaction
        // const doc = yield firestore().doc(`users/${uid}`).get()
        // self._transactions = doc.data().transactions
      } catch (err) {
        console.tron.error(`not able to update transaction ${err}`, Error.captureStackTrace(err))
      }
    })

    const updateBalance = flow(function* () {
      if (getParentOfType(self, DataStoreModel).onboarding.has(Onboarding.bankOnboarded)) {
        try {
          const result = yield functions().httpsCallable("getFiatBalances")({})
          console.tron.log("balance", result)
          if ("data" in result) {
            self.confirmedBalance = result.data
            // TODO: add unconfirmed balance
          }
        } catch (err) {
          console.tron.error(`can't fetch the balance ${err}`, Error.captureStackTrace(err))
        }
      } else {
        self.confirmedBalance = 0
      }
    })
    const update = flow(function* () {
      yield updateBalance()
      yield updateTransactions()
    })

    return { updateBalance, updateTransactions, update }
  })
  .views((self) => ({
    get currency() {
      return CurrencyType.USD
    },
    get transactions() {
      return self._transactions.map((tx) => ({
        name: tx.name,
        icon: tx.icon,
        amount: tx.amount,
        date: parseDate(tx.date), // FIXME timestamp
        cashback: tx.cashback,
      }))
    },
  }))

export const LndModel = BaseAccountModel.named("Lnd")
  .props({
    type: AccountType.Bitcoin,
    version: "...loading...",

    lndReady: false,
    walletExist: false,
    syncedToChain: false,

    onChainAddress: "",
    pubkey: "",
    network: "",
    blockHeight: 0,
    error: "",

    lastAddInvoice: "",
    receiveBitcoinScreenAlert: false,

    bestBlockHeight: types.maybe(types.number),
    startBlockHeight: types.maybe(types.number),
    percentSynced: 0,

    _transactions: types.array(LightningInvoiceModel),

  })
  .actions((self) => {
    return {
      setLndReady: flow(function* () {
        self.lndReady = true
      }),

      update: flow(function* () {
        //@ts-ignore not sure why that is
        yield self.updateTransactions()
        //@ts-ignore not sure why that is
        yield self.updateBalance()
      }),

      newAddress: flow(function* () {
      }),

      decodePayReq: flow(function* (payReq) {
        // TODO use require('bolt11')
        // but check if same format as lnd
      }),

      addInvoice: flow(function* (request: IAddInvoiceRequest) {
        try {
          const { data } = yield functions().httpsCallable("addInvoice")(request)
          self.lastAddInvoice = data.request
        } catch (err) {
          console.log("error with AddInvoice")
          throw err
        }
      }),

      // doesn't update the store, should this be here?
      payInvoice: flow(function* ({ invoice }: IPayInvoice) {
        const { invoicePayment } = yield functions().httpsCallable("payInvoice")({ invoice })
      }),

      clearLastInvoice: flow(function* () {
        self.lastAddInvoice = ""
      }),

      resetReceiveBitcoinScreenAlert: flow(function* () {
        self.receiveBitcoinScreenAlert = false
      }),

      updateBalance: flow(function* () {
        try {
          const { data } = yield functions().httpsCallable("getLightningBalance")({})
          self.confirmedBalance = data.response
        } catch (err) {
          // TODO show visual indication of internet connection failure
          console.tron.log(err.toString())
        }
      }),

      updateTransactions: flow(function* () {
        try {
          const { data } = yield functions().httpsCallable("getLightningTransactions")({})
          console.tron.log(typeof data.response)
          console.tron.log(data.response)
          self._transactions = data.response
        } catch (err) {
          // TODO show visual indication of internet connection failure
          console.tron.log(err.toString())
        }
      }),

    }
  })
  .views((self) => ({
    get currency() {
      return CurrencyType.BTC
    },

    get transactions() {
      return self._transactions
    },
  }))

export const AccountModel = types.union(FiatAccountModel, LndModel)

export const RatesModel = types
  .model("Rates", {
    USD: 1, // TODO is there a way to have enum as parameter?
    BTC: 0.0001, // Satoshi to USD default value
  })
  .actions((self) => {
    const update = flow(function* () {
      try {
        // TODO: BTC price
        self.BTC = 0.00001
      } catch (err) {
        console.tron.error("error getting BTC price from firestore", err)
      }
    })
    return { update }
  })
  .views((self) => ({
    // workaround on the fact key can't be enum
    rate(currency: CurrencyType) {
      if (currency === CurrencyType.USD) {
        return self.USD
      } else if (currency === CurrencyType.BTC) {
        return self.BTC
      } else {
        throw Error(`currency don't exist`)
      }
    },
  }))

interface BalanceRequest {
  currency: CurrencyType
  account: AccountType
}

// // TODO move to utils?
// const translateTitleFromItem = (item) => {
//   console.tron.log({ item })
//   const object = translate(`RewardsScreen.rewards`)
//   for (const property in object) {
//     for (const property2 in object[property]) {
//       if (property2 === item) {
//         return object[property][property2].title
//       }
//     }
//   }
//   return "Translation not found"
// }

export const OnboardingModel = types
  .model("Onboarding", {
    currency: CurrencyType.BTC,
    stage: types.array(types.enumeration<Onboarding>("Onboarding", Object.values(Onboarding))),
  })
  .actions((self) => ({
    add: flow(function* (step) {
      if (self.stage.findIndex((item) => item == step) === -1) {
        self.stage.push(step)
      }
    }),

    // dummy function to have same interface with bitcoin wallet and bank account
    update: flow(function* () { }),

    // for debug when resetting account
    _reset: flow(function* () {
      while (self.stage.length > 0) {
        self.stage.pop()
      }
    }),
  }))
  .views((self) => ({
    // TODO using: BalanceRequest type, how to set it?
    has(step: Onboarding) {
      // TODO exception
      // --> notifications
      // --> phoneAuth

      return self.stage.findIndex((item) => item == step) !== -1
    },

    get balance() {
      const rewards = self.stage.map((item) => OnboardingRewards[item])
      if (rewards.length > 0) {
        return rewards.reduce((acc, curr) => acc + curr)
      } else {
        return 0
      }
    },

    get rewardsAvailable() {
      return difference(Object.values(Onboarding), self.stage).length
    },

    get transactions() {
      const txs = self.stage.map((item) => ({
        // TODO: interface for those pending transactions
        name: translateTitleFromItem(item),
        icon: "ios-exit",
        amount: OnboardingRewards[item],
        date: Date.now(),
      }))

      console.tron.log({ txs })
      return txs
    },
  }))

export const DataStoreModel = types
  .model("DataStore", {
    onboarding: types.optional(OnboardingModel, {}),
    fiat: types.optional(FiatAccountModel, {}),
    rates: types.optional(RatesModel, {}),
    exchange: types.optional(ExchangeModel, {}),
    lnd: types.optional(LndModel, {}), // TODO should it be optional?
  })
  .actions((self) => ({
    updateBalance: flow(function* () {
      yield Promise.all([
        yield self.rates.update(),
        yield self.fiat.updateBalance(),
        yield self.lnd.updateBalance(),
      ])
    }),
  }))
  .views((self) => ({
    // TODO using: BalanceRequest type, how to set it?
    balances({ currency, account }) {
      const balances = {}

      const btcConversion = self.rates.rate(self.lnd.currency) / self.rates.rate(currency)

      balances[AccountType.Bitcoin] = self.lnd.balance * btcConversion
      balances[AccountType.Bank] = self.fiat.balance / self.rates.rate(currency)
      balances[AccountType.BankAndBitcoin] =
        balances[AccountType.Bank] + balances[AccountType.Bitcoin]

      return balances[account]
    },
  }))

/**
  * Un-comment the following to omit model attributes from your snapshots (and from async storage).
  * Useful for sensitive data like passwords, or transitive state like whether a modal is open.

  * Note that you'll need to import `omit` from ramda, which is already included in the project!
  *  .postProcessSnapshot(omit(["password", "socialSecurityNumber", "creditCardNumber"]))
  */

type DataStoreType = Instance<typeof DataStoreModel>
export interface DataStore extends DataStoreType { }

type DataStoreSnapshotType = SnapshotOut<typeof DataStoreModel>
export interface DataStoreSnapshot extends DataStoreSnapshotType { }

export type LndStore = Instance<typeof LndModel>

type FiatAccountType = Instance<typeof FiatAccountModel>
export interface FiatAccount extends FiatAccountType { }

// type CryptoAccountType = Instance<typeof LndModel> // FIXME is that still accurate?
// export interface CryptoAccount extends CryptoAccountType {}

type RatesType = Instance<typeof RatesModel>
export interface Rates extends RatesType { }
