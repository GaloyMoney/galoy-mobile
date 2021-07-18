/* eslint-disable react-native/no-inline-styles */
/* eslint-disable @typescript-eslint/no-var-requires */
import { gql, useApolloClient, useLazyQuery, useMutation } from "@apollo/client"
import { useNavigation } from "@react-navigation/native"
import LottieView from "lottie-react-native"
import * as React from "react"
import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, Text, View } from "react-native"
import { Button, Input } from "react-native-elements"
import EStyleSheet from "react-native-extended-stylesheet"
import { TextInput } from "react-native-gesture-handler"
import ReactNativeHapticFeedback from "react-native-haptic-feedback"
import Icon from "react-native-vector-icons/Ionicons"
import { InputPayment } from "../../components/input-payment"
import { Screen } from "../../components/screen"
import {
  balanceBtc,
  btc_price,
  getPubKey,
  QUERY_TRANSACTIONS,
  USERNAME_EXIST,
  WALLET,
} from "../../graphql/query"
import { usePrefCurrency } from "../../hooks/usePrefCurrency"
import { translate } from "../../i18n"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { textCurrencyFormatting } from "../../utils/currencyConversion"
import { IPaymentType, validPayment } from "../../utils/parsing"
import { sleep } from "../../utils/sleep"
import { Token } from "../../utils/token"
import { UsernameValidation } from "../../utils/validation"

const successLottie = require("../move-money-screen/success_lottie.json")
const errorLottie = require("../move-money-screen/error_lottie.json")
const pendingLottie = require("../move-money-screen/pending_lottie.json")

const LIGHTNING_PAY = gql`
  mutation payInvoice($invoice: String!, $amount: Int, $memo: String) {
    invoice {
      payInvoice(invoice: $invoice, amount: $amount, memo: $memo)
    }
  }
`

const PAY_KEYSEND_USERNAME = gql`
  mutation payKeysendUsername(
    $amount: Int!
    $destination: String!
    $username: String!
    $memo: String
  ) {
    invoice {
      payKeysendUsername(
        amount: $amount
        destination: $destination
        username: $username
        memo: $memo
      )
    }
  }
`

const ONCHAIN_PAY = gql`
  mutation onchain_pay($address: String!, $amount: Int!, $memo: String) {
    onchain {
      pay(address: $address, amount: $amount, memo: $memo) {
        success
      }
    }
  }
`

// TODO: add back destination
const LIGHTNING_FEES = gql`
  mutation lightning_fees($invoice: String, $amount: Int) {
    invoice {
      getFee(invoice: $invoice, amount: $amount)
    }
  }
`

const ONCHAIN_FEES = gql`
  mutation onchain_fees($address: String!, $amount: Int) {
    onchain {
      getFee(address: $address, amount: $amount)
    }
  }
`

const styles = EStyleSheet.create({
  buttonStyle: {
    backgroundColor: color.primary,
    marginBottom: 32,
    marginHorizontal: 24,
    marginTop: 32,
  },

  errorText: {
    color: palette.red,
    fontSize: 18,
  },

  icon: {
    color: palette.darkGrey,
    marginRight: 15,
  },

  lottie: {
    height: "200rem",
    width: "200rem",
    // backgroundColor: 'red',
  },

  mainView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  row: { flexDirection: "row" },

  section: {
    marginHorizontal: 48,
    // width: "100%"
  },

  smallText: {
    color: palette.darkGrey,
    fontSize: 18,
    textAlign: "left",
    width: "48rem",
  },
})

const regexFilter = (network) => {
  switch (network) {
    case "mainnet":
      return /^(1|3|bc1|lnbc1)/i
    case "testnet":
      return /^(2|bcrt|lnbcrt)/i
    case "regtest":
      return /^(2|bcrt|lnbcrt)/i
    default:
      console.warn("error network")
  }
}

type SendBitcoinScreenProps = {
  route: Record<string, any>
}

export const SendBitcoinScreen: React.FC<SendBitcoinScreenProps> = ({
  route,
}: SendBitcoinScreenProps) => {
  const client = useApolloClient()
  const { goBack } = useNavigation()

  const [errs, setErrs] = useState([])
  const [invoiceError, setInvoiceError] = useState("")

  const [address, setAddress] = useState("")
  const [paymentType, setPaymentType] = useState<IPaymentType>(undefined)
  const [amountless, setAmountless] = useState(false)
  const [initAmount, setInitAmount] = useState(0)

  const [amount, setAmountProxy] = useState(0)
  // forcing sending positive value from the app
  const setAmount = (value) => setAmountProxy(value >= 0 ? value : -value)

  const [destination, setDestinationInternal] = useState("")
  const [invoice, setInvoice] = useState("")
  const [memo, setMemo] = useState("")
  const [initialMemo, setInitialMemo] = useState("")

  const setDestination = (input) => setDestinationInternal(input.trim())

  // if null ==> we don't know (blank fee field)
  // if -1, there is an error
  // otherwise, fee in sats
  const [fee, setFee] = useState(null)

  const [interactive, setInteractive] = useState(false)

  const [status, setStatus] = useState("idle")
  // idle, loading, pending, success, error

  const [queryTransactions] = useLazyQuery(QUERY_TRANSACTIONS, {
    fetchPolicy: "network-only",
  })

  const [lightningPay, { loading: paymentlightningLoading }] = useMutation(
    LIGHTNING_PAY,
    {
      update: () => queryTransactions(),
    },
  )

  const [payKeysendUsername, { loading: paymentKeysendLoading }] = useMutation(
    PAY_KEYSEND_USERNAME,
    { update: () => queryTransactions() },
  )
  // TODO: add user automatically to cache
  // {
  //   update(cache, { data }) {
  //     cache.modify({
  //       fields: {
  //         Contact
  //       }
  //     })
  // }}

  const [onchainPay, { loading: paymentOnchainLoading }] = useMutation(ONCHAIN_PAY, {
    update: () => queryTransactions(),
  })

  const [getLightningFees, { loading: lightningFeeLoading }] = useMutation(LIGHTNING_FEES)

  const [getOnchainFees, { loading: onchainFeeLoading }] = useMutation(ONCHAIN_FEES)

  const [updateWallet] = useLazyQuery(WALLET, { fetchPolicy: "network-only" })

  // TODO use a debouncer to avoid flickering https://github.com/helfer/apollo-link-debounce
  const [
    usernameExistsQuery,
    { loading: loadingUserNameExist, data: dataUsernameExists },
  ] = useLazyQuery(USERNAME_EXIST, { fetchPolicy: "network-only" })

  const [prefCurrency, nextPrefCurrency] = usePrefCurrency()

  const usernameExists = dataUsernameExists?.usernameExists ?? false

  const balance = balanceBtc(client)

  const { network } = new Token()
  const potentialBitcoinOrLightning = regexFilter(network).test(destination)

  useEffect(() => {
    reset()
    const { valid, username, amount, memo, currency } = validPayment(
      route.params?.payment,
      network,
      client,
    )
    if (route.params?.username || username) {
      setInteractive(false)
      setDestination(route.params?.username || username)
      if (currency === "USD") {
        const sats = Math.floor(amount / satusd)
        setInitAmount(sats)
        setAmount(sats)
      } else {
        setInitAmount(amount)
        setAmount(amount)
      }
      setMemo(memo)
    } else if (valid) {
      setInteractive(false)
      setDestination(route.params?.payment)
      setAmount(amount)
      setMemo(memo)
    } else {
      setInteractive(true)
    }
  }, [route.params])

  const reset = () => {
    setStatus("idle")
    setErrs([])
    setInvoiceError("")
    setAddress("")
    setPaymentType(undefined)
    setAmountless(false)
    setInitAmount(0)
    setAmount(0)
    setDestination("")
    setInvoice("")
    setMemo("")
    setInitialMemo("")
  }

  useEffect(() => {
    const fn = async () => {
      const {
        valid,
        errorMessage,
        invoice,
        amount: amountInvoice,
        amountless,
        memo: memoInvoice,
        paymentType,
        address,
        sameNode,
      } = validPayment(destination, network, client)

      if (valid) {
        setStatus("idle")
        setAddress(address)
        setPaymentType(paymentType)
        setInvoice(invoice)
        setInitAmount(amountInvoice)
        setAmountless(amountless)

        if (!amountless) {
          setAmount(amountInvoice)
        }

        if (!memo) {
          setMemo(memoInvoice)
        }

        setInitialMemo(memo)
        setInteractive(false)

        switch (paymentType) {
          case "lightning":
            if (sameNode) {
              setFee(0)
              return
            }

            if (amountless && amount == 0) {
              setFee(null)
              return
            }

            try {
              setFee(undefined)
              const {
                data: {
                  invoice: { getFee: fee },
                },
              } = await getLightningFees({
                variables: { invoice, amount: amountless ? amount : undefined },
              })
              setFee(fee)
            } catch (err) {
              console.warn({ err, message: "error getting lightning fees" })
              setFee(-1)
            }

            return
          case "onchain":
            if (amount == 0) {
              setFee(null)
              return
            }

            try {
              setFee(undefined)
              const {
                data: {
                  onchain: { getFee: fee },
                },
              } = await getOnchainFees({ variables: { address, amount } })
              setFee(fee)
            } catch (err) {
              console.warn({ err, message: "error getting onchains fees" })
              setFee(-1)
            }
        }
      } else if (errorMessage) {
        setPaymentType(paymentType)
        setInvoiceError(errorMessage)
        setInvoice(destination)
      } else {
        // it's kind of messy rn, but we need to check for more than just the regex, becuase we may have lightning:, bitcoin: also
        if (potentialBitcoinOrLightning) {
          return
        }

        setPaymentType("username")

        if (UsernameValidation.isValid(destination)) {
          usernameExistsQuery({ variables: { username: destination } })
        }

        setFee(null)
      }
    }

    fn()
  }, [destination, amount])

  const pay = async () => {
    if ((amountless || paymentType === "onchain") && amount === 0) {
      setStatus("error")
      setErrs([{ message: translate("SendBitcoinScreen.noAmount") }])
      return
    }

    if (!UsernameValidation.isValid(destination)) {
      setStatus("error")
      setErrs([{ message: translate("SendBitcoinScreen.invalidUsername") }])
      return
    }

    setErrs([])
    setStatus("loading")

    try {
      let optMemo
      if (initialMemo !== memo) {
        optMemo = memo
      }

      let mutation
      let variables
      let errors
      let data

      if (paymentType === "lightning") {
        mutation = lightningPay
        variables = { invoice, amount: amountless ? amount : undefined, memo: optMemo }
      } else if (paymentType === "onchain") {
        mutation = onchainPay
        variables = { address, amount, memo: optMemo }
      } else if (paymentType === "username") {
        mutation = payKeysendUsername

        // FIXME destination is confusing
        variables = {
          amount,
          destination: getPubKey(client),
          username: destination,
          memo: optMemo,
        }
      }

      try {
        ;({ data, errors } = await mutation({ variables }))
      } catch (err) {
        console.log({ err, errors }, "mutation error")

        setStatus("error")
        setErrs([err])
        return
      }

      let success
      let pending

      if (paymentType === "lightning") {
        success = data?.invoice?.payInvoice === "success" ?? false
        pending = data?.invoice?.payInvoice === "pending" ?? false
      } else if (paymentType === "onchain") {
        success = data?.onchain?.pay?.success
      } else if (paymentType === "username") {
        success = data?.invoice?.payKeysendUsername === "success" ?? false
      }

      if (success) {
        updateWallet()
        setStatus("success")
        await sleep(1000)
        updateWallet()
      } else if (pending) {
        setStatus("pending")
      } else {
        setStatus("error")
        setErrs(errors)
      }
    } catch (err) {
      console.log({ err }, "error loop")
      setStatus("error")
      setErrs([{ message: `an error occured. try again later\n${err}` }])
    }
  }

  useEffect(() => {
    if (status === "loading" || status === "idle") {
      return
    }

    let notificationType

    if (status === "pending" || status === "error") {
      notificationType = "notificationError"
    }

    if (status === "success") {
      notificationType = "notificationSuccess"
    }

    const optionsHaptic = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    }

    ReactNativeHapticFeedback.trigger(notificationType, optionsHaptic)
  }, [status])

  const satusd = btc_price(client)

  const feeTextFormatted = textCurrencyFormatting(fee ?? 0, satusd, prefCurrency)

  const feeText =
    fee === null && !usernameExists
      ? ""
      : fee > 0 && !!amount
      ? `${feeTextFormatted}, ${translate("common.Total")}: ${textCurrencyFormatting(
          fee + amount,
          satusd,
          prefCurrency,
        )}`
      : fee === -1 || fee === undefined
      ? fee
      : feeTextFormatted

  const totalAmount = fee == null ? amount : amount + fee
  const errorMessage =
    invoiceError ||
    (!!totalAmount && balance && totalAmount > balance && status !== "success"
      ? translate("SendBitcoinScreen.totalExceed", {
          balance: textCurrencyFormatting(balance, satusd, prefCurrency),
        })
      : null)

  return (
    <SendBitcoinScreenJSX
      status={status}
      paymentType={paymentType}
      amountless={amountless}
      initAmount={initAmount}
      setAmount={setAmount}
      setStatus={setStatus}
      invoice={invoice}
      address={address}
      memo={memo}
      errs={errs}
      amount={amount}
      goBack={goBack}
      pay={pay}
      satusd={satusd}
      fee={feeText}
      setMemo={setMemo}
      setDestination={setDestination}
      destination={destination}
      usernameExists={usernameExists}
      loadingUserNameExist={loadingUserNameExist}
      interactive={interactive}
      potentialBitcoinOrLightning={potentialBitcoinOrLightning}
      errorMessage={errorMessage}
      reset={reset}
      prefCurrency={prefCurrency}
      nextPrefCurrency={nextPrefCurrency}
    />
  )
}

type SendBitcoinScreenJSXProps = {
  status: string
  paymentType: string
  amountless: boolean
  initAmount: number
  setAmount: (amount: string) => void
  setStatus: (status: string) => void
  invoice: string
  fee
  address: string
  memo: string
  errs: any[]
  amount: number
  goBack: () => void
  pay: () => void
  satusd: number
  setMemo: (memo: string) => void
  setDestination: (destination: string) => void
  destination: string
  usernameExists: boolean
  loadingUserNameExist: boolean
  interactive: boolean
  potentialBitcoinOrLightning: boolean
  errorMessage: string
  reset: () => void
  prefCurrency: string
  nextPrefCurrency: () => void
}

export const SendBitcoinScreenJSX = ({
  status,
  paymentType,
  amountless,
  initAmount,
  setAmount,
  setStatus,
  invoice,
  fee,
  address,
  memo,
  errs,
  amount,
  goBack,
  pay,
  satusd,
  setMemo,
  setDestination,
  destination,
  usernameExists,
  loadingUserNameExist,
  interactive,
  potentialBitcoinOrLightning,
  errorMessage,
  reset,
  prefCurrency,
  nextPrefCurrency,
}: SendBitcoinScreenJSXProps) => (
  <Screen preset="fixed">
    <ScrollView
      style={styles.mainView}
      contentContainerStyle={{ justifyContent: "space-between" }}
    >
      <View style={styles.section}>
        <InputPayment
          prefCurrency={prefCurrency}
          nextPrefCurrency={nextPrefCurrency}
          editable={
            paymentType === "lightning" || paymentType === "onchain"
              ? amountless && (status === "idle" || status === "error")
              : status !== "success" // bitcoin // TODO: handle amount properly
          }
          initAmount={initAmount}
          onUpdateAmount={(input) => {
            setAmount(input)
            setStatus("idle")
          }}
          forceKeyboard
          price={satusd}
        />
      </View>
      <View style={{ marginTop: 18 }}>
        <Input
          placeholder={translate("SendBitcoinScreen.input")}
          leftIcon={
            <View style={styles.row}>
              <Text style={styles.smallText}>{translate("common.to")}</Text>
              <Icon
                name="ios-log-out"
                size={24}
                color={color.primary}
                style={styles.icon}
              />
            </View>
          }
          onChangeText={setDestination}
          rightIcon={
            UsernameValidation.hasValidLength(destination) &&
            !potentialBitcoinOrLightning &&
            paymentType === "username" ? (
              loadingUserNameExist ? (
                <ActivityIndicator size="small" />
              ) : UsernameValidation.isValid(destination) && usernameExists ? (
                <Text>✅</Text>
              ) : (
                <Text>⚠️</Text>
              )
            ) : paymentType === "lightning" || paymentType === "onchain" ? (
              <Icon
                name="ios-close-circle-outline"
                // size={styles.icon.fontSize}
                onPress={reset}
                size={30}
              />
            ) : null
          }
          value={
            paymentType === "lightning"
              ? invoice
              : paymentType === "onchain"
              ? address
              : destination
          }
          renderErrorMessage={false}
          editable={interactive && status !== "success"}
          selectTextOnFocus
          autoCompleteType="username"
          autoCapitalize="none"
        />
        <Input
          placeholder={translate("SendBitcoinScreen.note")}
          leftIcon={
            <View style={styles.row}>
              <Text style={styles.smallText}>{translate("common.note")}</Text>
              <Icon
                name="ios-create-outline"
                size={24}
                color={color.primary}
                style={styles.icon}
              />
            </View>
          }
          value={memo}
          onChangeText={(value) => setMemo(value)}
          renderErrorMessage={false}
          editable={status !== "success"}
          selectTextOnFocus
        />
        <Input
          placeholder={translate("SendBitcoinScreen.fee")}
          leftIcon={
            <View style={styles.row}>
              <Text style={styles.smallText}>{translate("common.Fee")}</Text>
              <Icon
                name="ios-pricetag"
                size={24}
                color={color.primary}
                style={styles.icon}
              />
            </View>
          }
          value={fee}
          errorMessage={errorMessage}
          errorStyle={{ fontSize: 16, alignSelf: "center", height: 18 }}
          editable={false}
          selectTextOnFocus
          InputComponent={(props) =>
            fee === undefined ? (
              <ActivityIndicator animating size="small" color={palette.orange} />
            ) : fee === -1 ? (
              <Text>{translate("SendBitcoinScreen.feeCalculationUnsuccessful")}</Text> // todo: same calculation as backend
            ) : (
              <TextInput {...props} />
            )
          }
        />
      </View>
      <View style={{ alignItems: "center" }}>
        {status === "success" && (
          <>
            <LottieView
              source={successLottie}
              loop={false}
              autoPlay
              style={styles.lottie}
              resizeMode="cover"
            />
            <Text style={{ fontSize: 18 }}>{translate("SendBitcoinScreen.success")}</Text>
          </>
        )}
        {status === "error" && (
          <>
            <LottieView
              source={errorLottie}
              loop={false}
              autoPlay
              style={styles.lottie}
              resizeMode="cover"
            />
            {errs.map(({ message }, item) => (
              <Text key={`error-${item}`} style={styles.errorText}>
                {message}
              </Text>
            ))}
          </>
        )}
        {status === "pending" && (
          <>
            <LottieView
              source={pendingLottie}
              loop={false}
              autoPlay
              style={styles.lottie}
              resizeMode="cover"
            />
            <Text style={{ fontSize: 18, textAlign: "center" }}>
              {translate("SendBitcoinScreen.notConfirmed")}
            </Text>
          </>
        )}
      </View>
      <Button
        buttonStyle={styles.buttonStyle}
        containerStyle={{ flex: 1 }}
        title={
          status === "success" || status === "pending"
            ? translate("common.close")
            : errs.length !== 0
            ? translate("common.tryAgain")
            : !amount
            ? translate("common.amountRequired")
            : !destination
            ? translate("common.usernameRequired")
            : translate("common.send")
        }
        onPress={() => (status === "success" || status === "pending" ? goBack() : pay())}
        disabled={!amount || !!errorMessage || !destination}
        loading={status === "loading"}
      />
    </ScrollView>
  </Screen>
)
