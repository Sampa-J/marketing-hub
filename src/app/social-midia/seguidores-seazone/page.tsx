'use client';

import { TeamLayout } from '@/components/team-layout';
import { MetricasSeazone } from '../calendario-seazone/_components/MetricasSeazone';

export default function Page() {
  return (
    <TeamLayout teamId="social-midia">
      <MetricasSeazone />
    </TeamLayout>
  );
}
