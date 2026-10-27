import type { DiagramBlock as DiagramData } from '@techcapsule/contracts';
import { Fragment, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme/ThemeProvider';
import type { ThemeColors } from '@/theme/tokens';

type Tone = DiagramData['nodes'][number]['tone'];

function toneColors(c: ThemeColors, tone: Tone) {
  switch (tone) {
    case 'primary':
      return { bg: c.primaryMuted, border: c.primary };
    case 'secondary':
      return { bg: c.secondaryMuted, border: c.secondary };
    case 'success':
      return { bg: c.successMuted, border: c.success };
    case 'warning':
      return { bg: c.warningMuted, border: c.warning };
    default:
      return { bg: c.surfaceRaised, border: c.borderStrong };
  }
}

/**
 * Nodes are laid out in authored order. Edges between neighbours are drawn as connectors;
 * any other edges are listed underneath so no relationship is silently dropped.
 */
export function DiagramBlock({ block }: { block: DiagramData }) {
  const theme = useTheme();
  const styles = useStyles();
  const horizontal = block.direction === 'horizontal';
  const labels = useMemo(() => new Map(block.nodes.map((n) => [n.id, n.label])), [block.nodes]);

  const { adjacent, extra } = useMemo(() => {
    const adjacentEdges = new Map<number, { label?: string; reverse: boolean }>();
    const others: DiagramData['edges'] = [];
    for (const edge of block.edges) {
      const from = block.nodes.findIndex((n) => n.id === edge.from);
      const to = block.nodes.findIndex((n) => n.id === edge.to);
      const gap = Math.min(from, to);
      if (Math.abs(from - to) === 1 && !adjacentEdges.has(gap)) {
        adjacentEdges.set(gap, { label: edge.label, reverse: from > to });
      } else {
        others.push(edge);
      }
    }
    return { adjacent: adjacentEdges, extra: others };
  }, [block.edges, block.nodes]);

  const content = block.nodes.map((node, i) => {
    const c = toneColors(theme.colors, node.tone);
    const connector = adjacent.get(i);
    return (
      <Fragment key={node.id}>
        <View
          style={[
            styles.node,
            horizontal && styles.nodeHorizontal,
            { backgroundColor: c.bg, borderColor: c.border },
          ]}
        >
          <Text variant="bodySmall" weight="700" align="center">
            {node.label}
          </Text>
          {node.description ? (
            <Text variant="caption" tone="muted" align="center">
              {node.description}
            </Text>
          ) : null}
        </View>
        {i < block.nodes.length - 1 ? (
          <View style={horizontal ? styles.connectorH : styles.connectorV}>
            {connector ? (
              <>
                <Icon
                  name={
                    horizontal
                      ? connector.reverse
                        ? 'arrow-back'
                        : 'arrow-forward'
                      : connector.reverse
                        ? 'arrow-up'
                        : 'arrow-down'
                  }
                  size={18}
                  tone="primary"
                />
                {connector.label ? (
                  <Text variant="caption" tone="subtle" align="center" numberOfLines={2}>
                    {connector.label}
                  </Text>
                ) : null}
              </>
            ) : (
              <View style={horizontal ? styles.spacerH : styles.spacerV} />
            )}
          </View>
        ) : null}
      </Fragment>
    );
  });

  return (
    <View style={styles.container} accessibilityLabel={block.title ?? 'Diagram'}>
      {block.title ? (
        <Text variant="overline" tone="primary">
          {block.title}
        </Text>
      ) : null}
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>{content}</View>
        </ScrollView>
      ) : (
        <View style={styles.column}>{content}</View>
      )}
      {extra.length > 0 ? (
        <View style={styles.extra}>
          {extra.map((e, i) => (
            <Text key={i} variant="caption" tone="muted">
              {labels.get(e.from)} → {labels.get(e.to)}
              {e.label ? `: ${e.label}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
      {block.caption ? (
        <Text variant="caption" tone="subtle">
          {block.caption}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.backgroundElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  column: { alignItems: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center' },
  node: {
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    gap: 2,
  },
  nodeHorizontal: { width: 140 },
  connectorV: { alignItems: 'center', paddingVertical: t.spacing.xs, gap: 2 },
  connectorH: { alignItems: 'center', paddingHorizontal: t.spacing.xs, width: 76, gap: 2 },
  spacerV: { height: t.spacing.md },
  spacerH: { width: t.spacing.md },
  extra: {
    gap: 4,
    paddingTop: t.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
}));
