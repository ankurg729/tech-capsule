import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Text';

export function StarRating({
  value,
  onChange,
  size = 28,
  disabled,
}: {
  value: number | null;
  onChange?: (stars: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="adjustable">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && star <= value;
        return (
          <Pressable
            key={star}
            disabled={!onChange || disabled}
            onPress={() => onChange?.(star)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
            accessibilityState={{ selected: filled }}
            hitSlop={4}
          >
            <Icon
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? theme.colors.warning : theme.colors.textSubtle}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
