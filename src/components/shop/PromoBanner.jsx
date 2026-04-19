import React from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PromoBanner({ settings }) {
  const navigate = useNavigate();

  if (settings && settings.banner_enabled === false) return null;

  const title = settings?.banner_title || 'Up to 70% OFF';
  const subtitle = settings?.banner_subtitle || '';
  const imageUrl = settings?.banner_image_url || '';
  const link = settings?.banner_link || '';

  const handleClick = () => {
    if (!link) return;
    if (link.startsWith('http')) {
      window.open(link, '_blank');
    } else {
      navigate(`/${link}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={handleClick}
      className={`mx-4 my-3 rounded-2xl overflow-hidden relative ${link ? 'cursor-pointer' : ''}`}
      style={{
        background: imageUrl
          ? `url(${imageUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))'
      }}
    >
      {imageUrl && <div className="absolute inset-0 bg-black/30 rounded-2xl" />}
      {!imageUrl && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
      )}
      <div className="relative p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-4 h-4 text-primary-foreground" />
            <span className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-wider">Flash Sale</span>
          </div>
          <h2 className="text-primary-foreground text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="text-primary-foreground/70 text-xs mt-0.5">{subtitle}</p>}
        </div>
        {link && (
          <div className="bg-primary-foreground/20 backdrop-blur-sm rounded-full p-3">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>
    </motion.div>
  );
}