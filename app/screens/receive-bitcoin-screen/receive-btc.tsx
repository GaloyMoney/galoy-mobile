import CalculatorIcon from "@app/assets/icons/calculator.svg"
import ChainIcon from "@app/assets/icons/chain.svg"
import ChevronIcon from "@app/assets/icons/chevron.svg"
import NoteIcon from "@app/assets/icons/note.svg"
import SwitchIcon from "@app/assets/icons/switch.svg"
import { usePriceConversion, useSubscriptionUpdates } from "@app/hooks"
import { palette } from "@app/theme"
import { satAmountDisplay } from "@app/utils/currencyConversion"
import { toastShow } from "@app/utils/toast"
import { TYPE_BITCOIN_ONCHAIN, TYPE_LIGHTNING_BTC, getFullUri } from "@app/utils/wallet"
import { Button, Text } from "@rneui/base"
import React, { useCallback, useEffect, useState } from "react"
import { Alert, Pressable, Share, TextInput, View } from "react-native"
import { FakeCurrencyInput } from "react-native-currency-input"
import EStyleSheet from "react-native-extended-stylesheet"
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"
import Icon from "react-native-vector-icons/Ionicons"
import QRView from "./qr-view"

import {
  LnInvoice,
  LnNoAmountInvoice,
  WalletCurrency,
  useLnInvoiceCreateMutation,
  useLnNoAmountInvoiceCreateMutation,
  useOnChainAddressCurrentMutation,
  useReceiveBtcQuery,
} from "@app/graphql/generated"
import { useDisplayCurrency } from "@app/hooks/use-display-currency"
import { useI18nContext } from "@app/i18n/i18n-react"
import { logGeneratePaymentRequest } from "@app/utils/analytics"
import Clipboard from "@react-native-community/clipboard"
import crashlytics from "@react-native-firebase/crashlytics"
import { testProps } from "../../../utils/testProps"
import { gql } from "@apollo/client"

const styles = EStyleSheet.create({
  container: {
    marginTop: "14rem",
    marginLeft: 20,
    marginRight: 20,
  },
  field: {
    padding: 10,
    backgroundColor: palette.white,
    borderRadius: 10,
    marginBottom: 12,
  },
  inputForm: {
    marginVertical: 20,
  },
  currencyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: palette.white,
    borderRadius: 10,
  },
  infoText: {
    color: palette.midGrey,
    fontSize: "12rem",
  },
  copyInvoiceContainer: {
    flex: 2,
    marginLeft: 10,
  },
  shareInvoiceContainer: {
    flex: 2,
    alignItems: "flex-end",
    marginRight: 10,
  },
  textContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
  },
  optionsContainer: {
    marginTop: 20,
  },
  fieldContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIconContainer: {
    justifyContent: "center",
    marginRight: 10,
  },
  fieldTextContainer: {
    flex: 4,
    justifyContent: "center",
  },
  fieldArrowContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  fieldText: {
    color: palette.lapisLazuli,
    fontSize: "14rem",
  },
  walletBalanceInput: {
    color: palette.lapisLazuli,
    fontSize: 20,
    fontWeight: "600",
  },
  convertedAmountText: {
    color: palette.coolGrey,
    fontSize: 12,
  },
  switchCurrencyIconContainer: {
    width: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  currencyInput: {
    flexDirection: "column",
    flex: 1,
  },
  toggle: {
    justifyContent: "flex-end",
  },
  button: {
    height: 60,
    borderRadius: 10,
    marginTop: 40,
  },
  activeButtonStyle: {
    backgroundColor: palette.lightBlue,
  },
  activeButtonTitleStyle: {
    color: palette.white,
    fontWeight: "bold",
  },
  invoiceInfo: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  primaryAmount: {
    fontWeight: "bold",
  },
  convertedAmount: {
    color: palette.coolGrey,
    marginLeft: 5,
  },
  fieldTitleText: {
    fontWeight: "bold",
    color: palette.lapisLazuli,
    marginBottom: 5,
  },
  disabledButtonStyle: {
    backgroundColor: palette.lighterGrey,
  },
  disabledButtonTitleStyle: {
    color: palette.lightBlue,
    fontWeight: "600",
  },
})

gql`
  query receiveBtc {
    me {
      defaultAccount {
        btcWallet {
          id
        }
      }
    }
  }

  mutation lnNoAmountInvoiceCreate($input: LnNoAmountInvoiceCreateInput!) {
    lnNoAmountInvoiceCreate(input: $input) {
      errors {
        __typename
        message
      }
      invoice {
        __typename
        paymentHash
        paymentRequest
        paymentSecret
      }
    }
  }

  mutation lnInvoiceCreate($input: LnInvoiceCreateInput!) {
    lnInvoiceCreate(input: $input) {
      errors {
        __typename
        message
      }
      invoice {
        __typename
        paymentHash
        paymentRequest
        paymentSecret
        satoshis
      }
    }
  }

  mutation onChainAddressCurrent($input: OnChainAddressCurrentInput!) {
    onChainAddressCurrent(input: $input) {
      errors {
        __typename
        message
      }
      address
    }
  }
`

const ReceiveBtc = () => {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [invoice, setInvoice] = useState<LnInvoice | LnNoAmountInvoice | null>(null)
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [satAmount, setSatAmount] = useState(0)
  const [usdAmount, setUsdAmount] = useState(0)
  const [memo, setMemo] = useState("")
  const [showMemoInput, setShowMemoInput] = useState(false)
  const [showAmountInput, setShowAmountInput] = useState(false)
  const [amountCurrency, setAmountCurrency] = useState("USD")

  const [paymentLayer, setPaymentLayer] = useState<"BITCOIN_ONCHAIN" | "LIGHTNING_BTC">(
    TYPE_LIGHTNING_BTC,
  )
  const { convertCurrencyAmount } = usePriceConversion()

  const { data } = useReceiveBtcQuery({ fetchPolicy: "cache-only" })
  const btcWalletId = data?.me?.defaultAccount?.btcWallet?.id

  const { lnUpdate } = useSubscriptionUpdates()

  const [lnNoAmountInvoiceCreate] = useLnNoAmountInvoiceCreateMutation()
  const [lnInvoiceCreate] = useLnInvoiceCreateMutation()
  const [generateBtcAddress] = useOnChainAddressCurrentMutation()
  const { LL } = useI18nContext()
  const { formatToDisplayCurrency } = useDisplayCurrency()

  const updateInvoice = useCallback(
    async ({ walletId, satAmount, memo }) => {
      setLoading(true)
      setInvoice(null)
      try {
        if (satAmount === 0) {
          logGeneratePaymentRequest({
            paymentType: "lightning",
            hasAmount: false,
            receivingWallet: WalletCurrency.Btc,
          })
          const {
            data: {
              lnNoAmountInvoiceCreate: { invoice, errors },
            },
          } = await lnNoAmountInvoiceCreate({
            variables: { input: { walletId, memo } },
          })
          if (errors && errors.length !== 0) {
            console.error(errors, "error with lnNoAmountInvoiceCreate")
            setErr(LL.ReceiveBitcoinScreen.error())
            return
          }
          setInvoice(invoice)
        } else {
          logGeneratePaymentRequest({
            paymentType: "lightning",
            hasAmount: true,
            receivingWallet: WalletCurrency.Btc,
          })
          const {
            data: {
              lnInvoiceCreate: { invoice, errors },
            },
          } = await lnInvoiceCreate({
            variables: {
              input: { walletId, amount: satAmount, memo },
            },
          })
          if (errors && errors.length !== 0) {
            console.error(errors, "error with lnInvoiceCreate")
            setErr(LL.ReceiveBitcoinScreen.error())
            return
          }
          setInvoice(invoice)
        }
      } catch (err) {
        console.error(err, "error with AddInvoice")
        crashlytics().recordError(err)
        setErr(`${err}`)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [lnInvoiceCreate, lnNoAmountInvoiceCreate, LL],
  )

  const updateBtcAddress = useCallback(
    async ({ walletId }) => {
      setLoading(true)
      try {
        logGeneratePaymentRequest({
          paymentType: "onchain",
          hasAmount: false,
          receivingWallet: WalletCurrency.Btc,
        })
        const {
          data: {
            onChainAddressCurrent: { address, errors },
          },
        } = await generateBtcAddress({
          variables: {
            input: { walletId },
          },
        })
        if (errors && errors.length !== 0) {
          console.error(errors, "error with generateBtcAddress")
          setErr(LL.ReceiveBitcoinScreen.error())
          return
        }
        setBtcAddress(address)
      } catch (err) {
        crashlytics().recordError(err)
        console.error(err, "error with updateBtcAddress")
        setErr(`${err}`)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [generateBtcAddress, LL],
  )

  const toggleAmountCurrency = () => {
    if (amountCurrency === "USD") {
      setAmountCurrency("BTC")
    }
    if (amountCurrency === "BTC") {
      setAmountCurrency("USD")
      setUsdAmount(
        convertCurrencyAmount({
          amount: satAmount,
          from: "BTC",
          to: "USD",
        }),
      )
    }
  }

  useEffect((): void | (() => void) => {
    if (btcWalletId && !invoice && !showAmountInput && !showMemoInput) {
      if (paymentLayer === TYPE_LIGHTNING_BTC) {
        updateInvoice({ walletId: btcWalletId, satAmount, memo })
      }
      if (paymentLayer === TYPE_BITCOIN_ONCHAIN && !btcAddress) {
        updateBtcAddress({ walletId: btcWalletId })
      }
    }
  }, [
    btcAddress,
    btcWalletId,
    invoice,
    memo,
    paymentLayer,
    satAmount,
    showAmountInput,
    showMemoInput,
    updateBtcAddress,
    updateInvoice,
  ])

  const paymentDestination =
    paymentLayer === TYPE_LIGHTNING_BTC ? invoice?.paymentRequest : btcAddress

  const paymentFullUri = getFullUri({
    type: paymentLayer,
    input: paymentDestination,
    amount: satAmount,
    memo,
    prefix: false,
  })

  const copyToClipboard = useCallback(() => {
    Clipboard.setString(paymentFullUri)

    toastShow({
      message: (translations) => translations.ReceiveBitcoinScreen.copyClipboard(),
      currentTranslation: LL,
      type: "success",
    })
  }, [paymentFullUri, LL])

  const share = useCallback(async () => {
    try {
      const result = await Share.share({ message: paymentFullUri })

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      crashlytics().recordError(error)
      Alert.alert(error.message)
    }
  }, [paymentFullUri])

  const togglePaymentLayer = () => {
    setInvoice(null)
    setPaymentLayer((currentPaymentLayer) => {
      return currentPaymentLayer === TYPE_LIGHTNING_BTC
        ? TYPE_BITCOIN_ONCHAIN
        : TYPE_LIGHTNING_BTC
    })
  }

  const invoicePaid =
    lnUpdate?.paymentHash === invoice?.paymentHash && lnUpdate?.status === "PAID"

  const satAmountInUsd = convertCurrencyAmount({
    amount: satAmount,
    from: "BTC",
    to: "USD",
  })

  if (showAmountInput) {
    const usdAmountInSats = Math.round(
      convertCurrencyAmount({
        amount: usdAmount ?? 0,
        from: "USD",
        to: "BTC",
      }),
    )

    const validAmount =
      (amountCurrency === "BTC" && satAmount !== null) ||
      (amountCurrency === "USD" && usdAmount !== null)

    return (
      <View style={[styles.inputForm, styles.container]}>
        <View style={styles.currencyInputContainer}>
          <View style={styles.currencyInput}>
            {amountCurrency === "BTC" && (
              <>
                <FakeCurrencyInput
                  value={satAmount}
                  onChangeValue={(newValue) => setSatAmount(newValue)}
                  prefix=""
                  delimiter=","
                  separator="."
                  precision={0}
                  suffix=" sats"
                  minValue={0}
                  style={styles.walletBalanceInput}
                  autoFocus
                />
                <FakeCurrencyInput
                  value={satAmountInUsd}
                  prefix="$"
                  delimiter=","
                  separator="."
                  precision={2}
                  minValue={0}
                  editable={false}
                  style={styles.convertedAmountText}
                />
              </>
            )}
            {amountCurrency === "USD" && (
              <>
                <FakeCurrencyInput
                  value={usdAmount}
                  onChangeValue={(newValue) => setUsdAmount(newValue)}
                  prefix="$"
                  delimiter=","
                  separator="."
                  precision={2}
                  style={styles.walletBalanceInput}
                  minValue={0}
                  autoFocus
                />
                <FakeCurrencyInput
                  value={usdAmountInSats}
                  prefix=""
                  delimiter=","
                  separator="."
                  suffix=" sats"
                  precision={0}
                  minValue={0}
                  editable={false}
                  style={styles.convertedAmountText}
                />
              </>
            )}
          </View>

          <View style={styles.toggle}>
            <Pressable onPress={toggleAmountCurrency}>
              <View style={styles.switchCurrencyIconContainer}>
                <SwitchIcon />
              </View>
            </Pressable>
          </View>
        </View>

        <Button
          title={LL.ReceiveBitcoinScreen.updateInvoice()}
          buttonStyle={[styles.button, styles.activeButtonStyle]}
          titleStyle={styles.activeButtonTitleStyle}
          disabledStyle={[styles.button, styles.disabledButtonStyle]}
          disabledTitleStyle={styles.disabledButtonTitleStyle}
          disabled={!validAmount}
          onPress={() => {
            if (amountCurrency === "USD" && usdAmount) {
              setSatAmount(usdAmountInSats)
            }
            setShowAmountInput(false)
            setInvoice(null)
          }}
        />
      </View>
    )
  }

  if (showMemoInput) {
    return (
      <View style={styles.inputForm}>
        <View style={styles.container}>
          <Text style={styles.fieldTitleText}>{LL.SendBitcoinScreen.note()}</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.noteInput}
              placeholder={LL.SendBitcoinScreen.note()}
              onChangeText={(note) => setMemo(note)}
              value={memo}
              multiline={true}
              numberOfLines={3}
              autoFocus
            />
          </View>

          <Button
            title={LL.ReceiveBitcoinScreen.updateInvoice()}
            buttonStyle={[styles.button, styles.activeButtonStyle]}
            titleStyle={styles.activeButtonTitleStyle}
            onPress={() => {
              setShowMemoInput(false)
              setInvoice(null)
            }}
          />
        </View>
      </View>
    )
  }

  const displayAmount = () => {
    if (!satAmount) {
      return (
        <Text style={styles.primaryAmount}>
          {LL.ReceiveBitcoinScreen.flexibleAmountInvoice()}
        </Text>
      )
    }
    return (
      <>
        <Text style={styles.primaryAmount}>{satAmountDisplay(satAmount)}</Text>
        <Text style={styles.convertedAmount}>
          &#8776; {formatToDisplayCurrency(satAmountInUsd)}
        </Text>
      </>
    )
  }

  const invoiceReady = paymentDestination && !loading

  return (
    <KeyboardAwareScrollView>
      <View style={styles.container}>
        <Pressable onPress={copyToClipboard}>
          <QRView
            data={paymentDestination}
            type={paymentLayer}
            amount={satAmount}
            memo={memo}
            loading={!invoiceReady}
            completed={paymentLayer === TYPE_LIGHTNING_BTC ? invoicePaid : false}
            err={err}
          />
        </Pressable>
        <View style={styles.textContainer}>
          {invoiceReady ? (
            <>
              <View style={styles.copyInvoiceContainer}>
                <Pressable
                  {...testProps(LL.ReceiveBitcoinScreen.copyInvoice())}
                  onPress={copyToClipboard}
                >
                  <Text style={styles.infoText}>
                    <Icon style={styles.infoText} name="copy-outline" />
                    <Text> </Text>
                    {paymentLayer === TYPE_LIGHTNING_BTC
                      ? LL.ReceiveBitcoinScreen.copyInvoice()
                      : LL.ReceiveBitcoinScreen.copyAddress()}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.shareInvoiceContainer}>
                <Pressable
                  {...testProps(LL.ReceiveBitcoinScreen.shareInvoice())}
                  onPress={share}
                >
                  <Text style={styles.infoText}>
                    <Icon style={styles.infoText} name="share-outline" />
                    <Text> </Text>
                    {paymentLayer === TYPE_LIGHTNING_BTC
                      ? LL.ReceiveBitcoinScreen.shareInvoice()
                      : LL.ReceiveBitcoinScreen.shareAddress()}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text>{`${LL.ReceiveBitcoinScreen.generatingInvoice()}...`}</Text>
          )}
        </View>

        <View style={styles.invoiceInfo}>{displayAmount()}</View>

        <View style={styles.optionsContainer}>
          {!showAmountInput && (
            <View style={styles.field}>
              <Pressable onPress={() => setShowAmountInput(true)}>
                <View style={styles.fieldContainer}>
                  <View style={styles.fieldIconContainer}>
                    <CalculatorIcon />
                  </View>
                  <View style={styles.fieldTextContainer}>
                    <Text style={styles.fieldText}>
                      {LL.ReceiveBitcoinScreen.addAmount()}
                    </Text>
                  </View>
                  <View style={styles.fieldArrowContainer}>
                    <ChevronIcon />
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          {!showMemoInput && (
            <View style={styles.field}>
              <Pressable onPress={() => setShowMemoInput(true)}>
                <View style={styles.fieldContainer}>
                  <View style={styles.fieldIconContainer}>
                    <NoteIcon />
                  </View>
                  <View style={styles.fieldTextContainer}>
                    <Text style={styles.fieldText}>
                      {LL.ReceiveBitcoinScreen.setANote()}
                    </Text>
                  </View>
                  <View style={styles.fieldArrowContainer}>
                    <ChevronIcon />
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          <View style={styles.field}>
            <Pressable onPress={togglePaymentLayer}>
              <View style={styles.fieldContainer}>
                <View style={styles.fieldIconContainer}>
                  <ChainIcon />
                </View>
                <View style={styles.fieldTextContainer}>
                  <Text style={styles.fieldText}>
                    {paymentLayer === TYPE_LIGHTNING_BTC
                      ? LL.ReceiveBitcoinScreen.useABitcoinOnchainAddress()
                      : LL.ReceiveBitcoinScreen.useALightningInvoice()}
                  </Text>
                </View>
                <View style={styles.fieldArrowContainer}>
                  <ChevronIcon />
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAwareScrollView>
  )
}

export default ReceiveBtc
