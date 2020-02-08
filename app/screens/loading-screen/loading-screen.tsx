import auth from "@react-native-firebase/auth"
import { inject, observer } from "mobx-react"
import { getEnv } from "mobx-state-tree"
import * as React from "react"
import { useEffect } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"
import { withNavigation } from "react-navigation"
import { color } from "../../theme"
import { when } from "mobx"
import { VersionComponent } from "../../components/version"

const styles = StyleSheet.create({
  centerBackground: {
    flex: 1,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "space-around",
  },
})

// FIXME properly use the right callback function
const INIT_DELAY_LND = 500

export const LoadingScreen = withNavigation(
  inject("dataStore")(
    observer(({ dataStore, navigation }) => {
      
      useEffect(() => {
        const startLnd = async () => {
          getEnv(dataStore).lnd.start()
        }

        startLnd()

        setTimeout(async function(){ 
          await getEnv(dataStore).lnd.openWallet()
        }, INIT_DELAY_LND) 

      }, [])

      const onAuthStateChanged = async user => {
        // TODO : User type
        console.tron.log(`onAuthStateChanged`, user)
        console.log(`onAuthStateChanged`, user)

        await when(() => dataStore.lnd.lndReady === true)

        if (user === null) {
          // new install or no data yet
          navigation.navigate("authStack")
        } else {
          navigation.navigate("primaryStack")
        
      }}

useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged)
    return subscriber; // unsubscribe on unmount
}, [])

    return (
      <View style={styles.centerBackground}>
        <ActivityIndicator style={{flex: 1}} size="large" color={color.primary} />
        <VersionComponent style={{paddingVertical: 30}} />
      </View>
      )
    }),
  ),
)
