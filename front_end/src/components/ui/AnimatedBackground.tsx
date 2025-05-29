import React from "react";
import { motion } from "framer-motion";

const AnimatedBackground = () => {
  const colorfulCircles = [
    {
      id: 1,
      size: 400,
      x: 10,
      y: 20,
      color: "from-purple-300/30 to-pink-300/15",
      duration: 25,
      delay: 0,
    },
    {
      id: 2,
      size: 350,
      x: 70,
      y: 10,
      color: "from-blue-300/25 to-cyan-300/15",
      duration: 30,
      delay: 2,
    },
    {
      id: 3,
      size: 300,
      x: 20,
      y: 70,
      color: "from-indigo-300/25 to-purple-300/15",
      duration: 27,
      delay: 4,
    },
  ];

  // const floatingDots = Array.from({ length: 15 }, (_, i) => ({
  //   id: i,
  //   size: Math.random() * 20 + 10,
  //   x: Math.random() * 100,
  //   y: Math.random() * 100,
  //   color: [
  //     "bg-purple-400/40",
  //     "bg-pink-400/40",
  //     "bg-blue-400/40",
  //     "bg-indigo-400/40",
  //     "bg-teal-400/40",
  //     "bg-rose-400/40",
  //   ][Math.floor(Math.random() * 6)],
  //   duration: Math.random() * 10 + 15,
  //   delay: Math.random() * 5,
  // }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20" />
      {colorfulCircles.map((circle) => (
        <motion.div
          key={circle.id}
          className={`absolute rounded-full bg-gradient-to-br ${circle.color} blur-2xl`}
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
        />
      ))}

      {/* {floatingDots.map((dot) => (
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
      ))} */}

      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={`extra-${i}`}
          className="absolute rounded-full"
          style={{
            width: 150 + i * 50,
            height: 150 + i * 50,
            left: `${20 + i * 20}%`,
            top: `${15 + i * 20}%`,
            background: `radial-gradient(circle, ${
              [
                "rgba(168, 85, 247, 0.05)",
                "rgba(236, 72, 153, 0.05)",
                "rgba(59, 130, 246, 0.05)",
              ][i]
            } 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
          animate={{
            rotate: i % 2 === 0 ? 360 : -360,
          }}
          transition={{
            duration: 40 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
};

export default AnimatedBackground;
