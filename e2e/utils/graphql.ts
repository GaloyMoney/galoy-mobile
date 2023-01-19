import {
  ApolloClient,
  ApolloQueryResult,
  InMemoryCache,
  createHttpLink,
  NormalizedCacheObject,
} from "@apollo/client"
import {
  LnNoAmountInvoiceCreateDocument,
  LnNoAmountInvoicePaymentSendDocument,
  MeFragment,
  UserUpdateLanguageDocument,
  WalletsDocument,
} from "../../app/graphql/generated"

import fetch from "cross-fetch"

const config = {
  network: "signet",
  graphqlUrl: "https://api.staging.galoy.io/graphql",
}

const createGaloyServerClient = (config) => (authToken: string) => {
  return new ApolloClient({
    ssrMode: true,
    link: createHttpLink({
      uri: config.graphqlUrl,
      headers: {
        authorization: authToken ? `Bearer ${authToken}` : "",
      },
      fetch,
    }),
    cache: new InMemoryCache(),
  })
}

const randomizeTokens = (arr: string[]): string => {
  const randomIndex = Math.floor(Math.random() * arr.length)
  return arr[randomIndex]
}

const authTokens = process.env.GALOY_TEST_TOKENS?.split(",") || []
const secondAuthToken = process.env.GALOY_TOKEN_2 || ""
export const firstAuthToken = randomizeTokens(authTokens)

const getDefaultWalletId = async (client: ApolloClient<NormalizedCacheObject>) => {
  const accountResult: ApolloQueryResult<{ me: MeFragment }> = await client.query({
    query: WalletsDocument,
    fetchPolicy: "no-cache",
  })
  const walletId = accountResult.data.me.defaultAccount.wallets.filter(
    (w) => w.walletCurrency === "BTC",
  )[0].id

  return walletId
}

export const getInvoice = async () => {
  const client = createGaloyServerClient(config)(secondAuthToken)
  const walletId = await getDefaultWalletId(client)

  const result = await client.mutate({
    variables: { input: { walletId } }, // (lookup wallet 2 id from graphql) i.e "8914b38f-b0ea-4639-9f01-99c03125eea5"
    mutation: LnNoAmountInvoiceCreateDocument,
    fetchPolicy: "no-cache",
  })
  const invoice = result.data.lnNoAmountInvoiceCreate.invoice.paymentRequest

  return invoice
}

export const payInvoice = async (invoice: string) => {
  const client = createGaloyServerClient(config)(secondAuthToken)
  const walletId = await getDefaultWalletId(client)

  return client.mutate({
    variables: {
      input: {
        walletId,
        paymentRequest: invoice,
        amount: 150,
      },
    },
    mutation: LnNoAmountInvoicePaymentSendDocument,
    fetchPolicy: "no-cache",
  })
}

export const resetLanguage = async () => {
  const client = createGaloyServerClient(config)(firstAuthToken)

  return client.mutate({
    variables: {
      input: {
        language: "",
      },
    },
    mutation: UserUpdateLanguageDocument,
    fetchPolicy: "no-cache",
  })
}
