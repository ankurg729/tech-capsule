import type { Technology } from '@techcapsule/contracts';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui';
import { TECH_VISUALS } from './visuals';

export function TechIcon({ technology, size = 40 }: { technology: Technology; size?: number }) {
  const visual = TECH_VISUALS[technology];
  return (
    <LinearGradient
      colors={visual.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={visual.icon} size={size * 0.5} color="#FFFFFF" />
    </LinearGradient>
  );
}
