import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles } from '@/theme/ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';

/** Bottom sheet modal used for confirmations, reports and pickers. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </Text>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} size={34} />
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: t.colors.overlay },
  sheet: {
    backgroundColor: t.colors.backgroundElevated,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
    gap: t.spacing.md,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.borderStrong,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
}));
