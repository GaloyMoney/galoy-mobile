import * as React from "react"
import { useState } from "react"
import { Screen } from "../../components/screen"
import { Onboarding } from "../../components/onboarding"
import { Text } from "../../components/text"
import { StyleSheet, Alert } from "react-native"
import { inject, observer } from "mobx-react"
import functions from '@react-native-firebase/functions'
import { Loader } from "../../components/loader"
import { withNavigation } from "react-navigation"
import { saveString } from "../../utils/storage"
import { CurrencyType } from "../../models/data-store/CurrencyType"
import { AccountType } from "../accounts-screen/AccountType"
import { OnboardingSteps } from "../loading-screen"

export const lightningLogo = require("./LightningBolt.png")
export const galoyLogo = require("./GaloyLogo.png")
export const bitcoinAndLockLogo = require("./BitcoinLockLogo.png")
export const dollarCardATMLogo = require("./DollarCardATMLogo.png")
export const presentLogo = require("./PresentLogo.png")
export const partyPopperLogo = require("./PartyPopperLogo.png")
export const bellLogo = require("./BellLogo.png")

const styles = StyleSheet.create({
text: {
  fontSize: 20,
  textAlign: "center",
  paddingHorizontal: 40,
},
})

export const WelcomeGaloyScreen = () => {  
  return (
    <Screen>
      <Onboarding next="welcomeBitcoin" image={galoyLogo}>
        <Text style={styles.text}>
          Welcome! Galoy is a new type of app for managing your money
          </Text>
        </Onboarding>
    </Screen>
  )
}

export const WelcomeBitcoinScreen = () => {
  return (
    <Screen>
      <Onboarding next="welcomeBank" image={bitcoinAndLockLogo}>
        <Text style={styles.text}>It's a simple, secure Bitcoin wallet</Text>
        </Onboarding>
    </Screen>
  )
}

export const WelcomeBankScreen = () => {
  return (
    <Screen>
      <Onboarding next="welcomeEarn" image={dollarCardATMLogo}>
        <Text style={styles.text}>And a digital bank account too</Text>
        </Onboarding>
    </Screen>
  )
}

export const WelcomeEarnScreen = () => {
    return (
      <Screen>
        <Onboarding next="welcomeFirstSats" image={presentLogo}>
           <Text style={styles.text}>By using Galoy you earn Bitcoin</Text>
         </Onboarding>
      </Screen>
    )
}

export const WelcomeFirstSatsScreen = () => {
    return (
      <Screen>
        <Onboarding next="welcomePhoneInput"
         header="+1,000 sats"
         image={partyPopperLogo}
         >
         <Text style={styles.text}>
           You've earned some sats for installing the Galoy app. 
           Sats are small portions of bitcoin. Hooray!
          </Text>
        </Onboarding>
      </Screen>
    )
}

export const WelcomeBackCompletedScreen = 
  withNavigation(inject("dataStore")(observer(
  ({dataStore, navigation}) => {
  
  const [loading, setLoading] = useState(false);

  const action = async () => {
    setLoading(true)
    try {
      const invoice = await dataStore.lnd.addInvoice({
        value: 100, memo: "Claimed Rewards"
      })
      const result = await functions().httpsCallable('payInvoice')({ invoice })
      console.tron.log(invoice, result)
      navigation.navigate('firstReward')
    } catch(err) {
      const error = `error paying invoice + ${err}`
      console.tron.error(error)
      Alert.alert(error)
    } finally {
      setLoading(false)
    }
  }


  return (
    <Screen>
      <Loader loading={loading} />
      <Onboarding 
        action={action}
        header="+1,000 sats pending"
        image={partyPopperLogo}
        >
          <Text style={styles.text}>Your wallet is ready.{'\n'}
Now send us a payment request so we can send your sats.</Text>
        </Onboarding>
    </Screen>
  )
})))

export const FirstRewardScreen = inject("dataStore")(observer(
  ({dataStore}) => {

  dataStore.lnd.updateBalance()

  const balance = dataStore.balances({
    currency: CurrencyType.BTC, 
    account: AccountType.Bitcoin,
  })

  return (
    <Screen>
      <Onboarding
        next="enableNotifications"
        header={`+ ${balance} sats`}
        image={lightningLogo}
        >
        <Text style={styles.text}>Success!{'\n'}{'\n'}
You’ve been paid{'\n'}your first reward.</Text>
      </Onboarding>
    </Screen>
  )
}))

export const EnableNotificationsScreen = () => {
  // TODO

  return (
    <Screen>
      <Onboarding
        next="allDone"
        image={bellLogo}
        >
        <Text style={styles.text}>
        Enable notifications to get alerts when you receive payments in the future.
        </Text>
      </Onboarding>
    </Screen>
  )
}

export const AllDoneScreen = withNavigation(inject("dataStore")(observer(
  ({navigation, dataStore}) => {

    const action = async () => {
      await saveString('onboarding', OnboardingSteps.onboarded)
      navigation.navigate('primaryStack')
    }

    const balance = dataStore.balances({
      currency: CurrencyType.BTC, 
      account: AccountType.Bitcoin,
    })

    return (
      <Screen>
        <Onboarding
         action={action}
         header={`+ ${balance} sats`}
         image={galoyLogo}
         >
         <Text style={styles.text}>
          All done here, you're finished setting up a wallet
          </Text>
       </Onboarding>
      </Screen>
    )
})))
