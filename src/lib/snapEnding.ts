export function isSnapEnding(timeHundredths: number) {
  const ending = Math.abs(timeHundredths) % 100;
  return ending !== 0 && ending % 11 === 0;
}
