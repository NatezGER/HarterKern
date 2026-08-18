import { motion } from "framer-motion";
import { useSeason } from "@/hooks/useSeason";

export function HeroCard() {
  const { season, isAllTime } = useSeason();
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65 }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#10120f] px-6 py-8 shadow-2xl sm:px-10 sm:py-10 lg:px-16 lg:py-12"
    >
      <div className="absolute inset-0 bg-hero-grid bg-[size:44px_44px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <div className="absolute -right-24 -top-32 size-[32rem] rounded-full bg-gold-400/[0.13] blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-full w-1/2 opacity-60">
        <div className="absolute bottom-[-20%] right-[5%] h-[115%] w-24 rotate-[22deg] bg-gradient-to-t from-gold-500/40 to-transparent blur-[1px]" />
        <div className="absolute bottom-[-30%] right-[30%] h-[110%] w-1 rotate-[22deg] bg-gold-300/40" />
      </div>

      <div className="relative py-3 sm:py-5">
          <motion.div
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="display-title text-[clamp(3.25rem,10vw,7.5rem)] italic leading-[0.78]">
              Harter Kern
            </h1>
            <p className="gold-text mt-4 font-display text-[clamp(1.75rem,5vw,4rem)] font-black uppercase italic leading-none tracking-[-0.03em]">
              2 Fast 2 Drink
            </p>
            {!isAllTime && <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/45 sm:text-sm">Saison {season}</p>}
          </motion.div>
      </div>
    </motion.section>
  );
}
