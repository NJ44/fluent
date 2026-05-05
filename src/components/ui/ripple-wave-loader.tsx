import { motion } from 'framer-motion';

interface RippleWaveLoaderProps {
  small?: boolean;
}

export function RippleWaveLoader({ small = false }: RippleWaveLoaderProps) {
  const barCount = small ? 5 : 7;
  const barH = small ? 'h-4' : 'h-8';
  const barW = small ? 'w-1' : 'w-2';

  return (
    <div className="flex items-center justify-center space-x-1">
      {[...Array(barCount)].map((_, i) => (
        <motion.div
          key={i}
          className={`${barH} ${barW} rounded-full bg-teal-500`}
          animate={{
            scaleY: [0.5, 1.5, 0.5],
            scaleX: [1, 0.8, 1],
            translateY: ['0%', '-15%', '0%'],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}
