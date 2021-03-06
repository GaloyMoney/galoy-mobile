/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: wallet
// ====================================================

export interface wallet_wallet_transactions {
  __typename: "Transaction";
  id: string;
  amount: number;
  description: string;
  created_at: number;
  /**
   * https: // www.apollographql.com/docs/graphql-tools/scalars/
   */
  hash: string | null;
  type: string;
  usd: number | null;
  fee: number | null;
  feeUsd: number | null;
  pending: boolean | null;
  username: string | null;
  date: string;
  date_format: string;
  date_nice_print: string;
  isReceive: boolean;
  text: string;
}

export interface wallet_wallet {
  __typename: "Wallet";
  id: string | null;
  balance: number | null;
  currency: string | null;
  transactions: (wallet_wallet_transactions | null)[] | null;
}

export interface wallet {
  wallet: (wallet_wallet | null)[] | null;
}
