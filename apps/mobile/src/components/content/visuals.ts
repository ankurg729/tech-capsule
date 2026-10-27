import type { NewsCategory, Technology } from '@techcapsule/contracts';
import type { IconName } from '@/components/ui';

export const TECH_VISUALS: Record<Technology, { icon: IconName; colors: [string, string] }> = {
  mcp: { icon: 'git-network-outline', colors: ['#8B5CF6', '#6366F1'] },
  rag: { icon: 'library-outline', colors: ['#6366F1', '#3B82F6'] },
  'ai-agents': { icon: 'hardware-chip-outline', colors: ['#A855F7', '#EC4899'] },
  openai: { icon: 'sparkles-outline', colors: ['#10B981', '#0EA5E9'] },
  nodejs: { icon: 'logo-nodejs', colors: ['#22C55E', '#15803D'] },
  javascript: { icon: 'logo-javascript', colors: ['#EAB308', '#F59E0B'] },
  typescript: { icon: 'code-slash-outline', colors: ['#3B82F6', '#1D4ED8'] },
  docker: { icon: 'cube-outline', colors: ['#0EA5E9', '#2563EB'] },
  kubernetes: { icon: 'boat-outline', colors: ['#3B82F6', '#6366F1'] },
  react: { icon: 'logo-react', colors: ['#06B6D4', '#3B82F6'] },
  'react-native': { icon: 'phone-portrait-outline', colors: ['#06B6D4', '#8B5CF6'] },
  python: { icon: 'logo-python', colors: ['#3B82F6', '#EAB308'] },
  databases: { icon: 'server-outline', colors: ['#14B8A6', '#0EA5E9'] },
  devops: { icon: 'infinite-outline', colors: ['#F97316', '#EF4444'] },
  other: { icon: 'bulb-outline', colors: ['#64748B', '#475569'] },
};

export const NEWS_ICONS: Record<NewsCategory, IconName> = {
  'ai-models': 'hardware-chip-outline',
  'ai-tools': 'construct-outline',
  'web-dev': 'globe-outline',
  'cloud-devops': 'cloud-outline',
  'open-source': 'git-branch-outline',
  research: 'flask-outline',
  industry: 'business-outline',
};
