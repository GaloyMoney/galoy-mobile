import { ScrollView } from "react-native-gesture-handler"
import { Screen } from "@app/components/screen"
import { GaloyPrimaryButton } from "@app/components/atomic/galoy-primary-button"
import { useI18nContext } from "@app/i18n/i18n-react"
import { ActivityIndicator, Button, TouchableOpacity, View } from "react-native"
import { GaloyIcon } from "@app/components/atomic/galoy-icon"
import { makeStyles, Text, useTheme } from "@rneui/themed"
import { usePersistentStateContext } from "@app/store/persistent-state"
import { useNavigation } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import { RootStackParamList } from "@app/navigation/stack-param-lists"
import { useApolloClient, gql } from "@apollo/client"
import { useUserLogoutMutation, useUsernameLazyQuery } from "@app/graphql/generated"
import { useCallback, useEffect, useState } from "react"
import messaging from "@react-native-firebase/messaging"
import crashlytics from "@react-native-firebase/crashlytics"
import { logLogout } from "@app/utils/analytics"

gql`
  query username {
    me {
      username
    }
  }
`

type ProfileProps = {
  username: string
  token: string
  selected?: boolean
}

export const ProfileScreen: React.FC = () => {
  const styles = useStyles()
  const {
    theme: { colors },
  } = useTheme()
  const { LL } = useI18nContext()
  const { persistentState } = usePersistentStateContext()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  const { galoyAuthToken: curToken, galoyAllAuthTokens: allTokens } = persistentState

  const [profiles, setProfiles] = useState<ProfileProps[]>([])
  const [fetchUsername, { error, refetch }] = useUsernameLazyQuery({
    fetchPolicy: "no-cache",
  })
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUsernames = async () => {
      setLoading(true)
      const profiles: ProfileProps[] = []
      let counter = 1
      for (const token of allTokens) {
        try {
          const { data } = await fetchUsername({
            context: {
              headers: {
                authorization: `Bearer ${token}`,
              },
            },
          })
          if (data && data.me) {
            profiles.push({
              username: data.me.username ? data.me.username : `Account ${counter++}`,
              token,
              selected: token === curToken,
            })
          }
        } catch (err) {
          console.error(`Failed to fetch username for token ${token}`, err)
        }
      }
      setProfiles(profiles)
      setLoading(false)
    }
    fetchUsernames()
  }, [allTokens, fetchUsername, curToken])

  if (error) {
    return (
      <Screen>
        <View style={styles.errorWrapper}>
          <Text adjustsFontSizeToFit style={styles.errorText}>
            {LL.ProfileScreen.error()}
          </Text>
          <Button
            title="reload"
            disabled={loading}
            color={colors.error}
            onPress={() => refetch()}
          />
        </View>
      </Screen>
    )
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator animating size="large" color={colors.primary} />
        </View>
      </Screen>
    )
  }

  const handleAddNew = () => {
    navigation.navigate("getStarted")
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScrollView contentContainerStyle={styles.outer}>
        {profiles.map((profile, index) => {
          return <Profile key={index} {...profile} />
        })}
        <GaloyPrimaryButton onPress={handleAddNew} containerStyle={styles.addNewButton}>
          <GaloyIcon name="user" size={30} style={styles.icon} />
          <Text>{LL.ProfileScreen.addNew()}</Text>
        </GaloyPrimaryButton>
      </ScrollView>
    </Screen>
  )
}

const Profile: React.FC<ProfileProps> = ({ username, token, selected }) => {
  const styles = useStyles()
  const { LL } = useI18nContext()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { updateState } = usePersistentStateContext()
  const client = useApolloClient()
  const [userLogoutMutation] = useUserLogoutMutation({
    fetchPolicy: "no-cache",
  })

  const logout = useCallback(async (): Promise<void> => {
    try {
      const deviceToken = await messaging().getToken()
      logLogout()
      await Promise.race([
        userLogoutMutation({ variables: { input: { deviceToken } } }),
        // Create a promise that rejects after 2 seconds
        // this is handy for the case where the server is down, or in dev mode
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Logout mutation timeout"))
          }, 2000)
        }),
      ])
    } catch (err: unknown) {
      if (err instanceof Error) {
        crashlytics().recordError(err)
        console.debug({ err }, `error logout`)
      }
    }
  }, [userLogoutMutation])

  const handleLogout = async () => {
    updateState((state) => {
      if (state) {
        return {
          ...state,
          galoyAllAuthTokens: state.galoyAllAuthTokens.filter((t) => t !== token),
        }
      }
      return state
    })
    await logout()
  }

  const handleProfileSwitch = () => {
    updateState((state) => {
      if (state) {
        return {
          ...state,
          galoyAuthToken: token,
        }
      }
      return state
    })
    client.clearStore() // clear cache to load fresh data using new token
    navigation.navigate("Primary")
  }

  return (
    <TouchableOpacity onPress={handleProfileSwitch}>
      <View style={styles.profile}>
        <View style={styles.iconContainer}>
          {selected && (
            <GaloyIcon name="check-circle" size={30} style={styles.checkIcon} />
          )}
        </View>
        <Text>{username}</Text>
        {!selected && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{LL.ProfileScreen.logout()}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.divider}></View>
    </TouchableOpacity>
  )
}

const useStyles = makeStyles(({ colors }) => ({
  outer: {
    marginTop: 4,
    paddingBottom: 20,
    display: "flex",
    flexDirection: "column",
    rowGap: 12,
  },
  iconContainer: {
    height: 30,
    width: 30,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    marginRight: 10,
  },
  addNewButton: {
    marginVertical: 20,
    marginHorizontal: "auto",
    width: 150,
  },
  divider: {
    borderWidth: 1,
    borderColor: colors.grey4,
  },
  profile: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginHorizontal: 10,
  },
  checkIcon: {
    color: colors._green,
    margin: 10,
  },
  logoutButton: {
    marginLeft: "auto",
    marginRight: 10,
  },
  logoutButtonText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  errorWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: "50%",
    marginBottom: "50%",
  },
  errorText: {
    color: colors.error,
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 20,
  },
  loadingWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: "50%",
    marginBottom: "50%",
  },
}))
