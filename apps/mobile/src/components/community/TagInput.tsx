import { tagSchema } from '@techcapsule/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { Chip, Input } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export const MAX_TAGS = 5;

/** Splits on commas/spaces into normalised tags; invalid fragments are left in the input. */
export function TagInput({
  tags,
  onChange,
  error,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  error?: string;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const next = [...tags];
    const rejected: string[] = [];
    for (const part of parts) {
      const parsed = tagSchema.safeParse(part.replace(/^#/, ''));
      if (!parsed.success) rejected.push(part);
      else if (!next.includes(parsed.data) && next.length < MAX_TAGS) next.push(parsed.data);
    }
    onChange(next);
    setDraft(rejected.join(' '));
    setLocalError(
      rejected.length ? 'Tags may contain letters, numbers, ".", "+", "#" and "-"' : null,
    );
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Input
        label={`Tags (${tags.length}/${MAX_TAGS})`}
        icon="pricetag-outline"
        placeholder="e.g. docker, nodejs"
        value={draft}
        autoCapitalize="none"
        autoCorrect={false}
        editable={tags.length < MAX_TAGS}
        onChangeText={(v) => (/[\s,]$/.test(v) ? commit(v) : setDraft(v))}
        onSubmitEditing={() => commit(draft)}
        onBlur={() => draft && commit(draft)}
        error={localError ?? error}
        hint="Separate tags with a comma or space. Tap a tag to remove it."
        testID="tag-input"
      />
      {tags.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {tags.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              icon="close"
              selected
              onPress={() => onChange(tags.filter((x) => x !== t))}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
