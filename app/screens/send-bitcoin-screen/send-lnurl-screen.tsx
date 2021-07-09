import React, { useEffect, useState } from "react"
import { gql, useApolloClient, useMutation, useLazyQuery } from "@apollo/client"
import { Alert, ScrollView, Text, View } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Button, Input } from "react-native-elements"
import LottieView from "lottie-react-native"
import EStyleSheet from "react-native-extended-stylesheet"

import errorLottie from "../move-money-screen/error_lottie.json"
import successLottie from "../move-money-screen/success_lottie.json"

import { Screen } from "../../components/screen"
import { InputPayment } from "../../components/input-payment"
import { PAYMENT_STATUS } from "../../constants/lnurl"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { btc_price, balanceBtc, QUERY_TRANSACTIONS } from "../../graphql/query"
import { usePrefCurrency } from "../../hooks/usePrefCurrency"
import { Row } from "../../components/shared/row"
import {
  invoiceRequest,
  isAmountValid,
  isProtocolSupported,
  parseUrl,
} from "../../utils/lnurl"
import { mSatToSat, satToMsat } from "../../utils/amount"

const LIGHTNING_FEES = gql`
  mutation lightning_fees($invoice: String, $amount: Int) {
    invoice {
      getFee(invoice: $invoice, amount: $amount)
    }
  }
`

const PAY_INVOICE = gql`
  mutation payInvoice($invoice: String!, $amount: Int, $memo: String) {
    invoice {
      payInvoice(invoice: $invoice, amount: $amount, memo: $memo)
    }
  }
`

const styles = EStyleSheet.create({
  animationContainer: { alignItems: "center" },
  buttonContainerStyle: {
    flex: 1,
  },
  buttonStyle: {
    backgroundColor: color.primary,
    marginBottom: 32,
    marginHorizontal: 24,
    marginTop: 32,
  },
  errorContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  errorText: {
    color: palette.red,
    fontSize: 18,
  },
  lottie: {
    height: "200rem",
    width: "200rem",
  },
  memoContainer: {
    marginLeft: "-11rem",
    marginVertical: 12,
  },
  memoInput: {
    fontSize: 14,
  },
  memoLabel: {
    color: palette.midGrey,
    fontSize: 14,
    fontWeight: "normal",
    marginBottom: "3rem",
    marginLeft: "1rem",
  },
  scroll: {
    justifyContent: "space-between",
  },
  section: {
    marginHorizontal: 48,
  },
  successText: {
    fontSize: 18,
  },
  transactionDetailView: {
    alignItems: "flex-start",
    flex: 1,
    marginHorizontal: "24rem",
    marginVertical: "24rem",
  },
})

type Props = {
  route: {
    params: {
      invoice: string
    }
  }
}

export const SendLNUrlScreen: React.FC<Props> = ({ route }: Props) => {
  const { navigate } = useNavigation()
  const client = useApolloClient()
  const price = btc_price(client)
  const balance = balanceBtc(client)

  const [fees, setFees] = useState(null)
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState(PAYMENT_STATUS.Pending)
  const [submitStatus, setSubmitStatus] = useState(0)
  const [callback, setCallback] = useState("")
  const [minSendable, setMinSendable] = useState(null)
  const [maxSendable, setMaxSendable] = useState(null)
  const [description, setDescription] = useState("")
  const [memo, setMemo] = useState("")
  const [maxMemoSize, setMaxMemoSize] = useState(0)
  const [prefCurrency, nextPrefCurrency] = usePrefCurrency()

  const [queryTransactions] = useLazyQuery(QUERY_TRANSACTIONS, {
    fetchPolicy: "network-only",
  })

  const [payInvoice] = useMutation(PAY_INVOICE, {
    update: () => queryTransactions(),
  })

  const [lightningFees] = useMutation(LIGHTNING_FEES)

  const hasEnoughBalance = balance >= amount
  const isAmountSendable = isAmountValid(amount, minSendable, maxSendable)

  useEffect(() => {
    const getFees = async (callback: string) => {
      const checkFeeInvoice = await invoiceRequest(callback, 1)
      const fees = await lightningFees({
        variables: { invoice: checkFeeInvoice },
      })

      const {
        data: {
          invoice: { getFee: fee },
        },
      } = fees

      setFees(fee)
    }

    const parseInitialInvoice = async () => {
      const lnurl = await parseUrl(route.params.invoice)
      const { tag, callback, minSendable, maxSendable, commentAllowed, metadata } = lnurl

      if (!isProtocolSupported(tag)) {
        Alert.alert("LNUrl protocol not supported")
        throw new Error("LNURL protocol not supported")
      }

      setAmount(mSatToSat(minSendable))
      setCallback(callback)
      setMinSendable(mSatToSat(minSendable))
      setMaxSendable(mSatToSat(maxSendable))
      setMaxMemoSize(commentAllowed)

      await getFees(callback)

      try {
        const description = JSON.parse(metadata)[0][1]
        setDescription(description)
      } catch (error) {
        setDescription("Invoice description not recognized")
      }
    }

    parseInitialInvoice()
  }, [])

  const submitPayment = async () => {
    setSubmitStatus(1)

    try {
      const paymentInvoice = await invoiceRequest(callback, amount, memo)
      const payment = await payInvoice({
        variables: { invoice: paymentInvoice, memo: description },
      })
      const { data } = payment

      setSubmitStatus(0)

      if (
        data.invoice.payInvoice === "success" ||
        data.invoice.payInvoice === "pending"
      ) {
        setStatus(PAYMENT_STATUS.Success)
      } else {
        setStatus(PAYMENT_STATUS.Error)
      }
    } catch (error) {
      setSubmitStatus(0)
      setStatus(PAYMENT_STATUS.Error)
    } finally {
      setTimeout(() => {
        setStatus(PAYMENT_STATUS.Finished)
      }, 4000)
    }
  }

  return (
    <Screen preset="fixed">
      <ScrollView style={styles.mainView} contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <InputPayment
            prefCurrency={prefCurrency}
            nextPrefCurrency={nextPrefCurrency}
            initAmount={amount}
            editable={true}
            onUpdateAmount={(input) => {
              setAmount(input)
            }}
            forceKeyboard
            price={price}
          />
          <View style={styles.errorContainer}>
            {!hasEnoughBalance && <Text>You do not have enough balance</Text>}
            {!minSendable !== null && !isAmountValid(amount, minSendable, maxSendable) && (
              <Text>
                You must set an amount between {minSendable} and {maxSendable}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.transactionDetailView}>
          <Row
            entry="Min. amount"
            value={minSendable === null ? "Loading..." : `${minSendable.toString()} sats`}
          />
          <Row
            entry="Max. amount"
            value={maxSendable === null ? "Loading..." : `${maxSendable.toString()} sats`}
          />
          <Row entry="Fees" value={fees === null ? "Loading fees..." : `${fees} sats`} />
          <Row entry="Description" value={description} />
          {!(maxMemoSize === 0) && (
            <Input
              label="Memo"
              labelStyle={styles.memoLabel}
              inputStyle={styles.memoInput}
              maxLength={maxMemoSize}
              placeholder="Insert a memo"
              containerStyle={styles.memoContainer}
              onChangeText={setMemo}
            />
          )}
        </View>
        <View style={styles.animationContainer}>
          {status === PAYMENT_STATUS.Success && (
            <>
              <LottieView
                source={successLottie}
                loop={false}
                autoPlay
                style={styles.lottie}
                resizeMode="cover"
              />
              <Text style={styles.successText}>{"Success"}</Text>
            </>
          )}

          {status === PAYMENT_STATUS.Error && (
            <>
              <LottieView
                source={errorLottie}
                loop={false}
                autoPlay
                style={styles.lottie}
                resizeMode="cover"
              />
              <Text style={styles.errorText}>{"Payment error"}</Text>
            </>
          )}
        </View>
        <Button
          buttonStyle={styles.buttonStyle}
          containerStyle={styles.buttonContainerStyle}
          title={status === PAYMENT_STATUS.Pending ? "Send" : "Close"}
          onPress={() =>
            status === PAYMENT_STATUS.Pending ? submitPayment() : navigate("Primary")
          }
          loading={submitStatus === 1}
          disabled={!amount || !hasEnoughBalance || !isAmountSendable}
        />
      </ScrollView>
    </Screen>
  )
}
