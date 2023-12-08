import { SettingsRow } from "../row"

import { useI18nContext } from "@app/i18n/i18n-react"

import { useNavigation } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import { RootStackParamList } from "@app/navigation/stack-param-lists"

import { useColorSchemeQuery } from "@app/graphql/generated"

export const ThemeSetting: React.FC = () => {
  const { LL } = useI18nContext()
  const { navigate } = useNavigation<StackNavigationProp<RootStackParamList>>()

  const colorSchemeData = useColorSchemeQuery()
  let colorScheme = LL.SettingsScreen.setByOs()

  switch (colorSchemeData?.data?.colorScheme) {
    case "light":
      colorScheme = LL.ThemeScreen.setToLight()
      break
    case "dark":
      colorScheme = LL.ThemeScreen.setToDark()
      break
  }

  return (
    <SettingsRow
      title={LL.SettingsScreen.theme()}
      subtitle={colorScheme}
      leftIcon="contrast-outline"
      action={() => navigate("theme")}
    />
  )
}
