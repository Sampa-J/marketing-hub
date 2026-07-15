"use client"

import { TeamLayout } from "@/components/team-layout"
import { InfluenciadoresSeazone } from "../calendario-seazone/_components/InfluenciadoresSeazone"

export default function Page() {
  return (
    <TeamLayout teamId="social-midia">
      <InfluenciadoresSeazone />
    </TeamLayout>
  )
}
