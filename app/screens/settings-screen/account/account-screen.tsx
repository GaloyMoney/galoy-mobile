import { ScrollView } from "react-native-gesture-handler"

import { Screen } from "@app/components/screen"
import { useLevel } from "@app/graphql/level-context"
import { useI18nContext } from "@app/i18n/i18n-react"
import { makeStyles } from "@rneui/themed"

import { SettingsGroup } from "../group"
import { TotpSetting } from "../totp"
import { AccountDeleteContextProvider } from "./account-delete-context"
import { AccountBanner } from "./banner"
import { AccountId } from "./id"
import { DangerZoneSettings } from "./settings/danger-zone"
import { EmailSetting } from "./settings/email"
import { PhoneSetting } from "./settings/phone"
import { UpgradeAccountLevelOne } from "./settings/upgrade"
import { UpgradeTrialAccount } from "./settings/upgrade-trial-account"

export const AccountScreen: React.FC = () => {
  const styles = useStyles()
  const { LL } = useI18nContext()

  const { isAtLeastLevelOne } = useLevel()

  return (
    <AccountDeleteContextProvider>
      <Screen keyboardShouldPersistTaps="handled">
        <ScrollView contentContainerStyle={styles.outer}>
          <AccountBanner />
          <AccountId />
          <UpgradeTrialAccount />
          {isAtLeastLevelOne && (
            <SettingsGroup
              name={LL.AccountScreen.loginMethods()}
              items={[EmailSetting, PhoneSetting]}
            />
          )}
          <SettingsGroup items={[TotpSetting, UpgradeAccountLevelOne]} />
          <DangerZoneSettings />
        </ScrollView>
      </Screen>
    </AccountDeleteContextProvider>
  )
}

const useStyles = makeStyles(() => ({
  outer: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 20,
    display: "flex",
    flexDirection: "column",
    rowGap: 12,
  },
}))
