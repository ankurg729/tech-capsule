import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
}

/** A Pressable with a subtle spring "press-in" animation, used by cards and buttons. */
export function PressableScale({ style, children, scaleTo = 0.97, disabled, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        animate(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.5 } : null]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
