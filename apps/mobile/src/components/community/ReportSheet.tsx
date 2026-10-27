import { REPORT_REASONS, type ReportReason, type ReportTarget } from '@techcapsule/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Chip, Input, Sheet, Text } from '@/components/ui';
import { errorMessage } from '@/lib/api/http';
import { useReport } from '@/queries/community';
import { useTheme } from '@/theme/ThemeProvider';

const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam',
  abuse: 'Abusive',
  'off-topic': 'Off-topic',
  misinformation: 'Misinformation',
  other: 'Other',
};

export interface ReportTargetRef {
  targetType: ReportTarget;
  targetId: string;
}

export function ReportSheet({
  target,
  onClose,
}: {
  target: ReportTargetRef | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const report = useReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason(null);
    setDetails('');
    setDone(null);
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!target || !reason) return;
    setError(null);
    try {
      const res = await report.mutateAsync({
        ...target,
        reason,
        details: details.trim() || undefined,
      });
      setDone(res.message);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Sheet visible={!!target} onClose={close} title={`Report ${target?.targetType ?? ''}`}>
      {done ? (
        <View style={{ gap: theme.spacing.md }}>
          <Banner tone="success" message={done} />
          <Button label="Done" onPress={close} fullWidth />
        </View>
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="bodySmall" tone="muted">
            Reports are reviewed by moderators. What&apos;s wrong with this post?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {REPORT_REASONS.map((r) => (
              <Chip
                key={r}
                label={REASON_LABELS[r]}
                selected={reason === r}
                onPress={() => setReason(r)}
              />
            ))}
          </View>
          <Input
            label="Details (optional)"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={1000}
            style={{ minHeight: 80 }}
          />
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button
            label="Submit report"
            onPress={submit}
            disabled={!reason}
            loading={report.isPending}
            fullWidth
          />
        </View>
      )}
    </Sheet>
  );
}
