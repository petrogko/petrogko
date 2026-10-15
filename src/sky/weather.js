/** OpenWeather condition id → which weather layer the sky draws. */
export function weatherKind(conditionId) {
  if (conditionId == null) return 'none';
  const group = Math.floor(conditionId / 100);
  if (conditionId === 800) return 'clear';
  if (conditionId === 801 || conditionId === 802) return 'light-clouds';
  if (conditionId === 803 || conditionId === 804 || group === 7) return 'dense-clouds';
  if (group === 2 || group === 3 || group === 5) return 'rain';
  if (group === 6) return 'snow';
  return 'none';
}
