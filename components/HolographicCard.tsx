
import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';

interface HolographicCardProps {
  imageUrl: string;
  name: string;
  sellerName: string;
  onClick?: () => void;
}

const HolographicCard: React.FC<HolographicCardProps> = ({ imageUrl, name, sellerName, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion Values for Mouse Position (relative to container)
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Spring configurations for smooth movement
  const springConfig = { damping: 20, stiffness: 120, mass: 0.6 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  // 3D Rotations based on mouse position
  const rotateX = useTransform(mouseYSpring, [0, 1], [25, -25]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-25, 25]);
  
  // Dynamic Shadow translation and scale
  const shadowX = useTransform(mouseXSpring, [0, 1], [20, -20]);
  const shadowY = useTransform(mouseYSpring, [0, 1], [20, -20]);

  // Foil Shine Effect
  const shineX = useTransform(mouseXSpring, [0, 1], [0, 100]);
  const shineY = useTransform(mouseYSpring, [0, 1], [0, 100]);
  const shineOpacity = useTransform(mouseXSpring, [0, 0.5, 1], [0.6, 0.2, 0.6]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="relative w-full h-96 md:h-[32rem] rounded-3xl bg-slate-950 overflow-hidden shadow-2xl border border-slate-800 group cursor-pointer perspective-[800px]"
    >
      {/* 1. Static Ambient Glow Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={imageUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.3 : 0.15 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center blur-[100px] pointer-events-none scale-125"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      </AnimatePresence>

      {/* 2. THE FLOATING CARD (Closer and Larger) */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          animate={{ 
            scale: isHovered ? 1.05 : 0.95,
            z: isHovered ? 50 : 0
          }}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative h-[85%] aspect-[2.5/3.5] transition-all duration-300 ease-out"
        >
          {/* Dynamic Shadow underneath the card */}
          <motion.div 
            style={{ 
                x: shadowX, 
                y: shadowY,
                scale: isHovered ? 1.1 : 1
            }}
            className="absolute inset-4 bg-black/80 blur-2xl rounded-xl pointer-events-none"
          />

          {/* Actual Card Image */}
          <motion.div 
            className="relative w-full h-full rounded-xl overflow-hidden border border-white/20 shadow-2xl shadow-black"
            style={{ transform: "translateZ(10px)" }}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={imageUrl}
                src={imageUrl}
                alt={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Holographic Overlays (Dynamic Shine) */}
            <motion.div
              className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: useTransform(
                  [shineX, shineY],
                  ([sx, sy]: number[]) =>
                    `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.7) 0%, transparent 50%), 
                     linear-gradient(${sx + sy}deg, transparent 0%, rgba(139,92,246,0.4) 45%, rgba(236,72,153,0.4) 50%, rgba(139,92,246,0.4) 55%, transparent 100%)`
                ),
              }}
            />

            {/* Foil Sparkle Texture */}
            <motion.div 
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-40 mix-blend-overlay transition-opacity duration-500"
                style={{
                    backgroundImage: `url("https://www.transparenttextures.com/patterns/stardust.png")`,
                    opacity: shineOpacity
                }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* 3. Static UI Info (Legible Overlay) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20 flex justify-between items-end z-20 pointer-events-none">
        <div className="flex flex-col gap-1">
          <h3 className="text-white font-black text-2xl md:text-3xl truncate max-w-xs md:max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              {name}
          </h3>
          <p className="text-slate-300 text-sm md:text-base flex items-center gap-2 drop-shadow-md">
            <span className="opacity-70 font-medium">Top Collector</span>
            <span className="font-black text-amber-400 tracking-wide">{sellerName}</span>
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-2 rounded-full text-[10px] md:text-xs text-white font-black tracking-[0.2em] uppercase shadow-xl">
          View Detail
        </div>
      </div>
    </div>
  );
};

export default HolographicCard;
