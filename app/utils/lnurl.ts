import { bech32 } from "bech32"

import { satToMsat } from "./amount"

import { SUPPORTED_PROTOCOLS } from "../constants/lnurl"

import type { LNUrlPay } from "../types/lnurl"

export const isLnUrl = (invoice: string): boolean =>
  invoice.toLowerCase().startsWith("lnurl")

export const isProtocolSupported = (tag: string): boolean => !!SUPPORTED_PROTOCOLS[tag]

export const isAmountValid = (
  amount: number,
  minSendable: number,
  maxSendable: number,
): boolean => minSendable <= amount && amount <= maxSendable

export const parseUrl = async (invoice: string): Promise<LNUrlPay> => {
  const { words } = bech32.decode(invoice, 2000)

  const url = Buffer.from(bech32.fromWords(words)).toString()

  return fetch(url)
    .then((response) => response.json())
    .then((json) => {
      return json as LNUrlPay
    })
}

export const invoiceRequest = (
  callback: string,
  amount: number,
  comment?: string,
): Promise<string> => {
  try {
    const nonce = Math.floor(Math.random() * 2e8)
    const finalAmount = satToMsat(amount)
    const separator = callback.includes("?") ? "&" : "?"

    const request = `${callback}${separator}amount=${finalAmount}&nonce=${nonce}&comment=${comment}`

    return fetch(request)
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "ERROR") {
          throw new Error("Error while requesting lnurl invoice")
        }

        return data.pr
      })
  } catch (error) {
    // TODO: treat errors
    console.log("ERR" + error)
  }
}
