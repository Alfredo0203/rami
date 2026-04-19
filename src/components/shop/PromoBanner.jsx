import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

const DEFAULTS = {
  promo_banner_label: 'Flash Sale',
  promo_banner_title: 'Up to 70% OFF',
  promo_banner_subtitle: 'Created by Alfred & Raquel',
  promo_banner_link: '',
  promo_banner_enabled: true,
};

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  return Math.max(Math.floor((midnight - now) / 1000), 0);
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-black/30 backdrop-blur-sm rounded-md px-1.5 py-0.5 min-w-[24px] text-center">
        <span className="text-primary-foreground text-xs font-black tabular-nums leading-none">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-primary-foreground/60 text-[8px] uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}

export default function PromoBanner() {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(getSecondsUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => {
      const secs = getSecondsUntilMidnight();
      setSeconds(secs === 0 ? 86400 : secs); // reinicia a 24h al llegar a 0
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.filter({ key: 'global' }).then(r => r[0] || {}),
    staleTime: 60_000,
  });

  const cfg = settings || {};
  const label    = cfg.promo_banner_label    ?? DEFAULTS.promo_banner_label;
  const title    = cfg.promo_banner_title    ?? DEFAULTS.promo_banner_title;
  const subtitle = cfg.promo_banner_subtitle ?? DEFAULTS.promo_banner_subtitle;
  const link     = cfg.promo_banner_link     ?? DEFAULTS.promo_banner_link;
  const enabled  = cfg.promo_banner_enabled  ?? DEFAULTS.promo_banner_enabled;

  if (!enabled) return null;

  const handleClick = () => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate('/' + link.replace(/^\//, ''));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      className={`mx-4 my-3 rounded-2xl overflow-hidden relative${link ? ' cursor-pointer' : ''}`}
      style={{ background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative p-4 flex items-center justify-between gap-3">
        {/* Left: label + title + subtitle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-primary-foreground shrink-0" />
            <span className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider truncate">{label}</span>
          </div>
          <h2 className="text-primary-foreground text-lg font-extrabold leading-tight">{title}</h2>
          {subtitle ? <p className="text-primary-foreground/70 text-[11px] mt-0.5 truncate">{subtitle}</p> : null}
        </div>

        {/* Right: countdown + arrow */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5">
            <CountdownUnit value={h} label="hrs" />
            <span className="text-primary-foreground/70 font-bold text-xs mb-3">:</span>
            <CountdownUnit value={m} label="min" />
            <span className="text-primary-foreground/70 font-bold text-xs mb-3">:</span>
            <CountdownUnit value={s} label="seg" />
          </div>
          {link && (
            <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-full p-2 ml-1">
              <ArrowRight className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}