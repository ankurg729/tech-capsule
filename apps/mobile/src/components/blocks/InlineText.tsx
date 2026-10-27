import { useMemo } from 'react';
import { Text, type TextProps } from '@/components/ui';
import { parseInline } from '@/lib/inline';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** Renders paragraph text with **bold** and `code` spans as nested native Text. */
export function InlineText({ text, ...props }: { text: string } & TextProps) {
  const theme = useTheme();
  const segments = useMemo(() => parseInline(text), [text]);
  return (
    <Text {...props}>
      {segments.map((s, i) =>
        s.type === 'bold' ? (
          <Text key={i} variant={props.variant} weight="700">
            {s.text}
          </Text>
        ) : s.type === 'code' ? (
          <Text
            key={i}
            variant={props.variant}
            style={{
              fontFamily: fonts.mono,
              fontSize: 13.5,
              color: theme.colors.syntax.keyword,
              backgroundColor: theme.colors.surfaceRaised,
            }}
          >
            {` ${s.text} `}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}
