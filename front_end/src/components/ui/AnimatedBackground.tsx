import React from "react";
import { motion } from "framer-motion";

const AnimatedBackground = () => {
  const colorfulCircles = [
    {
      id: 1,
      size: 400,
      x: 10,
      y: 20,
      color: "from-purple-300/40 to-pink-300/25",
      duration: 20,
      delay: 0,
    },
    {
      id: 2,
      size: 350,
      x: 70,
      y: 10,
      color: "from-blue-300/35 to-cyan-300/25",
      duration: 25,
      delay: 2,
    },
    {
      id: 3,
      size: 300,
      x: 20,
      y: 70,
      color: "from-pink-300/40 to-rose-300/25",
      duration: 18,
      delay: 4,
    },
    {
      id: 4,
      size: 450,
      x: 60,
      y: 60,
      color: "from-indigo-300/35 to-purple-300/25",
      duration: 22,
      delay: 1,
    },
    {
      id: 5,
      size: 200,
      x: 80,
      y: 40,
      color: "from-teal-300/40 to-green-300/25",
      duration: 15,
      delay: 3,
    },
    {
      id: 6,
      size: 180,
      x: 15,
      y: 50,
      color: "from-orange-300/35 to-yellow-300/25",
      duration: 17,
      delay: 5,
    },
    {
      id: 7,
      size: 220,
      x: 85,
      y: 80,
      color: "from-violet-300/40 to-fuchsia-300/25",
      duration: 19,
      delay: 2.5,
    },
  ];

  const floatingDots = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 20 + 10,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: [
      "bg-purple-400/40",
      "bg-pink-400/40",
      "bg-blue-400/40",
      "bg-indigo-400/40",
      "bg-teal-400/40",
      "bg-rose-400/40",
    ][Math.floor(Math.random() * 6)],
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20" />
      {colorfulCircles.map((circle) => (
        <motion.div
          key={circle.id}
          className={`absolute rounded-full bg-gradient-to-br ${circle.color} blur-3xl`}
          style={{
            width: circle.size,
            height: circle.size,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: circle.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: circle.duration * 0.7,
              repeat: Infinity,
            }}
          />

          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)`,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: circle.duration * 0.5,
              repeat: Infinity,
            }}
          />
        </motion.div>
      ))}

      {floatingDots.map((dot) => (
        <motion.div
          key={dot.id}
          className={`absolute rounded-full ${dot.color} blur-sm`}
          style={{
            width: dot.size,
            height: dot.size,
            left: `${dot.x}%`,
            top: `${dot.y}%`,
          }}
          animate={{
            y: [0, -200],
            rotate: 360,
          }}
          transition={{
            y: {
              duration: dot.duration,
              repeat: Infinity,
              ease: "linear",
            },
            rotate: {
              duration: dot.duration * 0.8,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            animate={{
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: dot.duration * 0.3,
              repeat: Infinity,
            }}
          />
        </motion.div>
      ))}

      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={`extra-${i}`}
          className="absolute rounded-full"
          style={{
            width: 150 + i * 50,
            height: 150 + i * 50,
            left: `${20 + i * 15}%`,
            top: `${15 + i * 12}%`,
            background: `radial-gradient(circle, ${
              [
                "rgba(168, 85, 247, 0.1)",
                "rgba(236, 72, 153, 0.1)",
                "rgba(59, 130, 246, 0.1)",
                "rgba(16, 185, 129, 0.1)",
                "rgba(245, 101, 101, 0.1)",
                "rgba(139, 92, 246, 0.1)",
              ][i]
            } 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
          animate={{
            rotate: i % 2 === 0 ? 360 : -360,
          }}
          transition={{
            duration: 30 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="w-full h-full rounded-full"
            animate={{
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 20 + i * 3,
              repeat: Infinity,
            }}
          />

          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${
                [
                  "rgba(168, 85, 247, 0.05)",
                  "rgba(236, 72, 153, 0.05)",
                  "rgba(59, 130, 246, 0.05)",
                  "rgba(16, 185, 129, 0.05)",
                  "rgba(245, 101, 101, 0.05)",
                  "rgba(139, 92, 246, 0.05)",
                ][i]
              } 0%, transparent 50%)`,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
            }}
          />
        </motion.div>
      ))}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
    </div>
  );
};

export default AnimatedBackground;
