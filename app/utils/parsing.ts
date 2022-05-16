import * as lightningPayReq from "bolt11"
import moment from "moment"
import url from "url"
import { networks, address } from "bitcoinjs-lib"
import { getDescription, getDestination, getUsername } from "./bolt11"
import { utils } from "lnurl-pay"
import type { INetwork } from "../types/network"
import * as parsing from "./parsing"

// TODO: look if we own the address

export type IPaymentType = "lightning" | "onchain" | "username" | "lnurl"

export interface IValidPaymentReponse {
  valid: boolean
  errorMessage?: string | undefined
  invoice?: string | undefined // for lightning
  address?: string | undefined // for bitcoin
  lnurl?: string | undefined // for lnurl
  amount?: number | undefined
  amountless?: boolean | undefined
  memo?: lightningPayReq.TagData | string | undefined
  paymentType?: IPaymentType
  sameNode?: boolean | undefined
  username?: string | undefined
  staticLnurlIdentifier?: boolean
}

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

export const lightningInvoiceHasExpired = (
  payReq: lightningPayReq.PaymentRequestObject,
): boolean => {
  return payReq?.timeExpireDate < moment().unix()
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

const debugConsole = (...args: string[]) => {
  let str = args.join("\n")
  console.log(`XXXXXXXXXXX\n${str}`)
}

export const validPayment = (
  input: string,
  network: INetwork,
  myPubKey: string,
  username: string,
): IValidPaymentReponse => {
  if (!input) {
    return { valid: false }
  }

  // input might start with 'lightning:', 'bitcoin:'
  let inputData = input.toLowerCase().startsWith("lightning:lnurl")
    ? input.replace("lightning:", "")
    : input

  const [protocol, data] = inputData.split(":")

  debugConsole(`protocol: ${protocol}`, `data: ${data}`)

  let paymentType = getPaymentType(protocol, data)

  debugConsole(`paymentTyp: ${paymentType}`)

  return getPaymentResponse(paymentType, protocol, data, network, myPubKey, username)
}

// one function to detect and return payment type
const getPaymentType = (protocol: string, data: string): IPaymentType => {
  if (
    protocol.toLowerCase() === "lightning" || // TODO manage bitcoin= case
    protocol.toLowerCase().startsWith("ln") // possibly a lightning address?
  ) {
    return "lightning"
  } else if (protocol.toLowerCase() === "bitcoin") {
    return "onchain"
  } else if (
    (protocol && protocol.toLowerCase().startsWith("lnurl")) ||
    (data && data.toLowerCase().startsWith("lnurl")) ||
    utils.isLightningAddress(protocol) // no protocol. let's see if this could have an address directly
  ) {
    return "lnurl"
  } else if (!utils.isLightningAddress(protocol) && protocol.toLowerCase() === "https") {
    return "username"
  } else {
    return "onchain"
  }
}

const getPaymentResponse = (
  paymentType: IPaymentType,
  protocol: string,
  data: string,
  network: INetwork,
  myPubKey: string,
  username: string,
): IValidPaymentReponse => {
  switch (paymentType) {
    case "onchain":
      return getOnChainPayResponse(data || protocol, network)
    case "lnurl":
      return getLNURLPayResponse(protocol, data)
    case "username":
      return getUsernamePayResponse(data)
    case "lightning":
      return getLightningPayResponse(protocol, data, network, myPubKey, username)
    default:
      return {
        valid: false,
        errorMessage: "We are unable to detect an invoice or payment address",
      }
  }
}

const getLNURL = (protocol: string, data: string): string => {
  if (protocol && protocol.toLowerCase().startsWith("lnurl")) {
    return protocol
  } else if (data && data.toLowerCase().startsWith("lnurl")) {
    return data
  } else if (utils.isLightningAddress(protocol)) {
    return utils.decodeUrlOrAddress(protocol)
  }
  return null
}

const getOnChainPayResponse = (data: string, network: INetwork): IValidPaymentReponse => {
  try {
    const decodedData = url.parse(data, true)
    let path = decodedData.pathname // using url node library. the address is exposed as the "host" here
    // some apps encode bech32 addresses in UPPERCASE
    const lowerCasePath = path.toLowerCase()
    if (
      lowerCasePath.startsWith("bc1") ||
      lowerCasePath.startsWith("tb1") ||
      lowerCasePath.startsWith("bcrt1")
    ) {
      path = lowerCasePath
    }

    let amount

    try {
      amount = parseAmount(decodedData.query.amount)
    } catch (err) {
      console.log(`can't decode amount ${err}`)
    }
    debugConsole("onChain3")
    // will throw if address is not valid
    address.toOutputScript(path, mappingToBitcoinJs(network)) // this currently throws. need to figure out why

    return {
      valid: true,
      paymentType: "onchain",
      address: path,
      amount,
      amountless: !amount,
    }
  } catch (e) {
    console.warn(`issue with payment ${e}`) // we catch here.
    return { valid: false }
  }
}

const getLightningPayResponse = (
  protocol: string,
  data: string,
  network: INetwork,
  myPubKey: string,
  username: string,
): IValidPaymentReponse => {
  const paymentType = "lightning"
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

  // cant overwrite data, first of all. need to pull out lightning param if it is present.
  // otherwise, do this nonsense.

  debugConsole("start", `data: ${data}`, `protocol: ${protocol}`)

  const dataToDecode = (
    protocol.toLowerCase() === "lightning" ? data : protocol
  ).toLowerCase()

  // some apps encode lightning invoices in UPPERCASE
  // data = protocol.toLowerCase()
  let payReq
  try {
    payReq = lightningPayReq.decode(dataToDecode)
  } catch (err) {
    debugConsole("catch")
    console.log(err)
    return { valid: false }
  }

  if (parsing.lightningInvoiceHasExpired(payReq)) {
    debugConsole("expiry")
    return { valid: false, errorMessage: "invoice has expired", paymentType }
  }
  debugConsole("Still looking")

  const sameNode = myPubKey === getDestination(payReq)
  const sameNodeAndUsername = sameNode && username === getUsername(payReq)

  if (sameNodeAndUsername) {
    debugConsole("Samenode&username")
    return {
      valid: false,
      paymentType,
      errorMessage: "invoice needs to be for a different user",
    }
  }

  let amount = 0
  let amountless = true

  if (payReq.satoshis || payReq.millisatoshis) {
    amount = payReq.satoshis ?? Number(payReq.millisatoshis) / 1000
    amountless = false
  }

  // TODO: show that the invoice has expired in the popup
  // TODO: manage testnet as well

  const memo = getDescription(payReq)
  return {
    valid: true,
    invoice: dataToDecode,
    amount,
    amountless,
    memo,
    paymentType,
    sameNode,
  }
}

const getLNURLPayResponse = (protocol: string, data: string): IValidPaymentReponse => {
  return {
    valid: true,
    lnurl: getLNURL(protocol, data),
    paymentType: "lnurl",
    amountless: false,
    staticLnurlIdentifier: utils.isLightningAddress(protocol),
  }
}

// TODO: empty return case here?
const getUsernamePayResponse = (data: string): IValidPaymentReponse => {
  const domain = "//ln.bitcoinbeach.com/"
  if (data.startsWith(domain)) {
    return {
      valid: true,
      paymentType: "username",
      username: data.substring(domain.length),
    }
  }
  return { valid: false }
}

const hasLNParam = (url: string): boolean => {
  return url.includes("lightning=")
  // need to check for valid payment address too?
}

// is there a url parser in the codebase already??
// url.parse(data, true) ?
