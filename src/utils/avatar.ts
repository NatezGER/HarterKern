const gradients = [
  "from-amber-300 to-yellow-700",
  "from-slate-200 to-slate-600",
  "from-orange-400 to-amber-800",
  "from-cyan-300 to-blue-700",
  "from-fuchsia-300 to-purple-800",
  "from-emerald-300 to-emerald-800",
  "from-rose-300 to-red-800",
  "from-indigo-300 to-indigo-800",
  "from-lime-300 to-green-800",
  "from-sky-300 to-sky-800",
];

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getAvatarGradient(id: string) {
  const hash = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}
