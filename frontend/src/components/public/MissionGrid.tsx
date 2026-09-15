import React, { useState } from 'react';
import { MissionCard } from './MissionCard';
import { MissionDetailDialog } from './MissionDetailDialog';
import { SectionHeading } from './SectionHeading';
import { headingSpan } from './headingSpan';
import type { Mission } from '../../lib/types';

const ACCENTS = ['bg-green', 'bg-blue', 'bg-orange'];

/*
  Written out in full because Tailwind reads literal strings from the source:
  a class name assembled at runtime is never generated.
*/
const SM_SPAN: Record<number, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
};

const LG_SPAN: Record<number, string> = {
  1: 'lg:col-span-1 lg:mb-0 lg:self-center lg:mx-0 lg:max-w-none lg:text-left',
  2: 'lg:col-span-2 lg:mb-0 lg:self-center lg:mx-0 lg:max-w-none lg:text-left',
  // A full-width banner is the composition the section already had.
  3: 'lg:col-span-3',
};

interface MissionGridProps {
  missions: Mission[];
  eyebrow: string;
  title: string;
  description?: string;
  as?: 'h1' | 'h2';
}

export const MissionGrid = ({ missions, eyebrow, title, description, as }: MissionGridProps) => {
  const [openId, setOpenId] = useState<string | null>(null);

  // Two columns between 640 and 1023px, three above: a span that balances the
  // three-column grid leaves the same orphan on the two-column one.
  const smSpan = headingSpan(missions.length, 2);
  const lgSpan = headingSpan(missions.length, 3);
  const openIndex = missions.findIndex((mission) => mission.id === openId);
  const open = openIndex >= 0 ? missions[openIndex] : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          accent="green"
          as={as}
          className={`${SM_SPAN[smSpan]} ${LG_SPAN[lgSpan]}`}
        />

        {missions.map((mission, index) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            index={index}
            onOpen={() => setOpenId(mission.id)}
          />
        ))}
      </div>

      <MissionDetailDialog
        mission={open}
        accent={ACCENTS[(openIndex < 0 ? 0 : openIndex) % ACCENTS.length]}
        onClose={() => setOpenId(null)}
      />
    </>
  );
};
