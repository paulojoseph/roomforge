import { parsePlan } from '@/core/plan-io';
import type { Plan } from '@/core/model';
import studio from '../../../public/plans/studio-30.json';
import apartment from '../../../public/plans/apartment-2br.json';
import lroom from '../../../public/plans/l-room.json';
import loft from '../../../public/plans/hand-drawn-loft.json';

export const EXAMPLES: { label: string; load: () => Plan }[] = [
  { label: 'Studio 30', load: () => parsePlan(JSON.stringify(studio)) },
  { label: 'Apartment 2br', load: () => parsePlan(JSON.stringify(apartment)) },
  { label: 'L room', load: () => parsePlan(JSON.stringify(lroom)) },
  { label: 'Loft', load: () => parsePlan(JSON.stringify(loft)) },
];
