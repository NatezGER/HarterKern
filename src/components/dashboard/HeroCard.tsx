import { motion } from "framer-motion";
import { ArrowDownRight, Gauge } from "lucide-react";
import { appMeta } from "@/data/mockData";

export function HeroCard() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65 }}
      className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#10120f] px-6 py-10 shadow-2xl sm:px-10 lg:min-h-[500px] lg:px-16 lg:py-14"
    >
      <div className="absolute inset-0 bg-hero-grid bg-[size:44px_44px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
      <div className="absolute -right-24 -top-32 size-[32rem] rounded-full bg-gold-400/[0.13] blur-[110px]" />
      <div className="absolute bottom-0 right-0 h-full w-1/2 opacity-60">
        <div className="absolute bottom-[-20%] right-[5%] h-[115%] w-24 rotate-[22deg] bg-gradient-to-t from-gold-500/40 to-transparent blur-[1px]" />
        <div className="absolute bottom-[-30%] right-[30%] h-[110%] w-1 rotate-[22deg] bg-gold-300/40" />
      </div>

      <div className="relative flex min-h-[350px] flex-col justify-between lg:min-h-[390px]">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-300">
          <Gauge className="size-4" />
          {appMeta.heroEyebrow}
        </div>
        <div>
          <motion.div
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="display-title text-[clamp(4.5rem,12vw,10rem)] italic leading-[0.68]">
              {appMeta.heroTitle}
            </h1>
            <p className="gold-text mt-5 font-display text-[clamp(2rem,5vw,4.8rem)] font-black uppercase italic leading-none tracking-[-0.03em]">
              {appMeta.heroSubtitle}
            </p>
          </motion.div>
          <div className="mt-9 flex items-end justify-between">
            <p className="max-w-sm text-sm leading-relaxed text-white/45 sm:text-base">{appMeta.heroDescription}</p>
            <span className="hidden size-12 place-items-center rounded-full border border-white/15 sm:grid">
              <ArrowDownRight className="size-5 text-gold-400" />
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
