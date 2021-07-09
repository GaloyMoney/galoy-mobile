export const LNURL_PAY = "payRequest"

export const SUPPORTED_PROTOCOLS = {
  [LNURL_PAY]: LNURL_PAY,
}

export enum PAYMENT_STATUS {
  Error = "Error",
  Pending = "Pending",
  Success = "Success",
  Finished = "Finished",
}
