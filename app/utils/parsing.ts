import { address, networks } from "bitcoinjs-lib"
import * as lightningPayReq from "bolt11"
import moment from "moment"
import url from "url"
import { getMyUsername, getPubKey } from "../graphql/query"
import { getDescription, getDestination, getUsername } from "./bolt11"
import { LNPAY_DOMAIN } from "./helper"

// TODO: look if we own the address

export type IPaymentType =
  | "lightning"
  | "onchain"
  | "onchainAndLightning"
  | "username"
  | undefined

export interface IValidPaymentReponse {
  valid: boolean
  errorMessage?: string
  invoice?: string // for lightning
  address?: string // for bitcoin
  amount?: number
  amountless?: boolean
  memo?: string
  paymentType?: IPaymentType
  sameNode?: boolean
  username?: string
  currency?: string
}

// TODO: enforce this from the backend
type INetwork = "mainnet" | "testnet" | "regtest"

const mappingToBitcoinJs = (input: INetwork) => {
  switch (input) {
    case "mainnet":
      return networks.bitcoin
    case "testnet":
      return networks.testnet
    case "regtest":
      return networks.regtest
  }
}

// from https://github.com/bitcoin/bips/blob/master/bip-0020.mediawiki#Transfer%20amount/size
const reAmount = /^(([\d.]+)(X(\d+))?|x([\da-f]*)(\.([\da-f]*))?(X([\da-f]+))?)$/i
function parseAmount(txt) {
  const m = txt.match(reAmount)
  return Math.round(
    m[5]
      ? (parseInt(m[5], 16) +
          (m[7] ? parseInt(m[7], 16) * Math.pow(16, -m[7].length) : 0)) *
          (m[9] ? Math.pow(16, parseInt(m[9], 16)) : 0x10000)
      : m[2] * (m[4] ? Math.pow(10, m[4]) : 1e8),
  )
}

export const validPayment = (
  input: string,
  network: INetwork,
  client: any /* apollo client */,
): IValidPaymentReponse => {
  const myPubKey = getPubKey(client)
  const username = getMyUsername(client)

  if (!input) {
    return { valid: false }
  }

  // input might start with 'lightning:', 'bitcoin:'
  // eslint-disable-next-line prefer-const
  let [protocol, data] = input.split(":")
  let paymentType: IPaymentType

  // some apps encode addresses and invoices in UPPERCASE
  data = data?.toLowerCase()

  if (protocol.toLowerCase() === "bitcoin") {
    paymentType = "onchain"

    // TODO manage bitcoin= case
  } else if (protocol.toLowerCase() === "lightning") {
    paymentType = "lightning"

    // no protocol. let's see if this could have an address directly
  } else if (protocol.toLowerCase().startsWith("ln")) {
    // possibly a lightning address?

    paymentType = "lightning"

    if (network === "testnet" && protocol.toLowerCase().startsWith("lnbc")) {
      return {
        valid: false,
        paymentType,
        errorMessage: "This is a mainnet invoice. The wallet is on testnet",
      }
    }

    if (network === "mainnet" && protocol.toLowerCase().startsWith("lntb")) {
      return {
        valid: false,
        paymentType,
        errorMessage: "This is a testnet invoice. The wallet is on mainnet",
      }
    }

    data = protocol.toLowerCase()
  } else if (protocol.toLowerCase() === "https") {
    const decodedData = url.parse(input, true)
    if (decodedData.hostname === LNPAY_DOMAIN) {
      return {
        valid: true,
        paymentType: "username",
        username: decodedData.pathname.replace(/\//g, ""),
        amount: Number(decodedData.query.amount),
        memo: decodedData.query.memo as string,
        currency: decodedData.query.currency as string,
      }
    }
  } else {
    // no schema
    data = protocol
  }

  if (paymentType === "onchain" || paymentType === undefined) {
    try {
      const decodedData = url.parse(data, true)
      const path = decodedData.pathname // using url node library. the address is exposed as the "host" here
      let amount

      try {
        amount = parseAmount(decodedData.query.amount)
      } catch (err) {
        console.log(`can't decode amount ${err}`)
      }

      // will throw if address is not valid
      address.toOutputScript(path, mappingToBitcoinJs(network))
      paymentType = "onchain"
      return {
        valid: true,
        paymentType,
        address: path,
        amount,
        amountless: !amount,
      }
    } catch (e) {
      console.warn(`issue with payment ${e}`)
      return { valid: false }
    }
  } else if (paymentType === "lightning") {
    let payReq
    try {
      payReq = lightningPayReq.decode(data)
    } catch (err) {
      console.log(err)
      return { valid: false }
    }
    // console.log(JSON.stringify({ payReq }, null, 2))

    const sameNode = myPubKey === getDestination(payReq)

    if (sameNode && username === getUsername(payReq)) {
      return {
        valid: false,
        paymentType,
        errorMessage: "invoice needs to be for a different user",
      }
    }

    let amount
    let amountless

    if (payReq.satoshis || payReq.millisatoshis) {
      amount = payReq.satoshis ?? Number(payReq.millisatoshis) * 1000
      amountless = false
    } else {
      amount = 0
      amountless = true
    }

    // TODO: show that the invoice has expired in the popup
    // TODO: manage testnet as well

    if (payReq?.timeExpireDate < moment().unix()) {
      return { valid: false, errorMessage: "invoice has expired", paymentType }
    }

    const memo = getDescription(payReq)
    return {
      valid: true,
      invoice: data,
      amount,
      amountless,
      memo,
      paymentType,
      sameNode,
    }
  } else {
    return {
      valid: false,
      errorMessage: "We are unable to detect an invoice or payment address",
    }
  }
}
