"use client";

import React from "react";

const AnimatedBackground = () => {
  const colorfulCircles = [
    {
      id: 1,
      size: 400,
      x: 10,
      y: 20,
      color: "from-purple-300/30 to-pink-300/15",
      duration: 25,
    },
    {
      id: 2,
      size: 350,
      x: 70,
      y: 10,
      color: "from-blue-300/25 to-cyan-300/15",
      duration: 30,
    },
    {
      id: 3,
      size: 300,
      x: 20,
      y: 70,
      color: "from-indigo-300/25 to-purple-300/15",
      duration: 27,
    },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ willChange: "transform" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20" />
      {colorfulCircles.map((circle) => (
        <div
          key={circle.id}
          className={`absolute rounded-full bg-gradient-to-br ${circle.color} blur-xl animate-rotate-slow`}
          style={{
            width: circle.size,
            height: circle.size,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            transform: "translate(-50%, -50%)",
            animationDuration: `${circle.duration}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
};

export default AnimatedBackground;
