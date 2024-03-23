import { useState } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"

import { testProps } from "@app/utils/testProps"
import { makeStyles, Icon, Text, Skeleton } from "@rneui/themed"

type Props = {
  title: string
  subtitle?: string
  subtitleShorter?: boolean
  leftIcon: string
  rightIcon?: string | null | React.ReactElement
  extraComponentBesideTitle?: React.ReactElement
  action: (() => void | Promise<void>) | null
  rightIconAction?: () => void | Promise<void>
  loading?: boolean
  spinner?: boolean
  shorter?: boolean
}

export const SettingsRow: React.FC<Props> = ({
  title,
  subtitle,
  subtitleShorter,
  leftIcon,
  rightIcon = "",
  action,
  rightIconAction = action,
  extraComponentBesideTitle = <></>,
  loading,
  spinner,
  shorter,
}) => {
  const [hovering, setHovering] = useState(false)
  const styles = useStyles({ hovering, shorter })

  if (loading) return <Skeleton style={styles.container} animation="pulse" />
  if (spinner)
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    )

  const RightIcon =
    rightIcon !== null &&
    (typeof rightIcon === "string" ? (
      <Icon name={rightIcon ? rightIcon : "chevron-forward"} type="ionicon" />
    ) : (
      rightIcon
    ))

  return (
    <Pressable
      onPressIn={action ? () => setHovering(true) : () => {}}
      onPressOut={action ? () => setHovering(false) : () => {}}
      onPress={action ? action : undefined}
      {...testProps(title)}
    >
      <View style={[styles.container, styles.spacing]}>
        <View style={[styles.container, styles.spacing]}>
          <Icon name={leftIcon} type="ionicon" />
          <View>
            <View style={styles.sidetoside}>
              <Text type="p2">{title}</Text>
              <Text>{extraComponentBesideTitle}</Text>
            </View>
            {subtitle && (
              <Text type={subtitleShorter ? "p4" : "p3"} ellipsizeMode="tail">
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={rightIconAction ? rightIconAction : undefined}
          {...testProps(title + "-right")}
        >
          <View style={styles.rightActionTouchArea}>{RightIcon}</View>
        </Pressable>
      </View>
    </Pressable>
  )
}

const useStyles = makeStyles(
  ({ colors }, { hovering, shorter }: { hovering: boolean; shorter?: boolean }) => ({
    container: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: 16,
      backgroundColor: hovering ? colors.grey4 : undefined,
      height: shorter ? 56 : 64,
    },
    spacing: {
      paddingHorizontal: 8,
      paddingRight: 12,
      paddingVertical: 6,
    },
    center: {
      justifyContent: "space-around",
    },
    rightActionTouchArea: {
      padding: 12,
      marginRight: -12,
      position: "relative",
    },
    sidetoside: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      columnGap: 5,
    },
  }),
)
