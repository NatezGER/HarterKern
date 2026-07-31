export function getPodiumCounters(values: { wins: number; secondPlaces: number; thirdPlaces: number }) {
  return [
    { rank: 1 as const, label: "Gold", count: values.wins },
    { rank: 2 as const, label: "Silber", count: values.secondPlaces },
    { rank: 3 as const, label: "Bronze", count: values.thirdPlaces },
  ];
}
