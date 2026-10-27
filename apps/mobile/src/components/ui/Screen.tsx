import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';

interface ScreenProps {
  children: ReactNode;
  /** Wraps content in a ScrollView. Leave false for screens that render their own FlatList. */
  scroll?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  edges?: Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  header,
  footer,
  edges = ['top'],
  refreshing,
  onRefresh,
  contentStyle,
  keyboard = false,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const styles = useStyles();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges} testID={testID}>
      {header}
      {keyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer}
        </>
      )}
    </SafeAreaView>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      {back ? (
        <IconButton
          icon="chevron-back"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          size={38}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant="heading" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={{ flex: 1 }}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="subtle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
          <Text variant="bodySmall" weight="700" tone="primary">
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  scrollContent: { padding: t.spacing.lg, paddingBottom: t.spacing.huge, gap: t.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
  },
  headerRight: { flexDirection: 'row', gap: t.spacing.sm },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.md },
}));
