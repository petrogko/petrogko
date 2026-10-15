import { getMoonIllumination } from 'suncalc';

export function moonAt(now) {
  const { fraction, phase, waxing } = getMoonIllumination(now);
  return { phase, illumination: fraction, waxing, visible: fraction >= 0.03 };
}
