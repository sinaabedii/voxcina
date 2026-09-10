import React from "react";

/**
 * Static decorative backdrop.
 *
 * The circles used to carry `animate-rotate-slow` (a 25-30s infinite 360deg
 * spin). Rotating a `rounded-full` element is visually a no-op -- the outline
 * is identical at every angle and the gradient inside is under `blur-xl` plus
 * a `bg-white/10` wash -- but because this layer is `fixed inset-0`, it forced
 * the compositor to repaint the whole viewport every frame, forever. Lighthouse
 * never saw the page settle: observedLastVisualChange sat at 11.6s and Speed
 * Index scored 0.46. Dropping the spin took desktop 87 -> 100 with no visible
 * difference. Do not reintroduce an infinite animation on this layer.
 */
const AnimatedBackground = () => {
  const colorfulCircles = [
    {
      id: 1,
      size: 400,
      x: 10,
      y: 20,
      color: "from-purple-300/30 to-pink-300/15",
    },
    {
      id: 2,
      size: 350,
      x: 70,
      y: 10,
      color: "from-blue-300/25 to-cyan-300/15",
    },
    {
      id: 3,
      size: 300,
      x: 20,
      y: 70,
      color: "from-indigo-300/25 to-purple-300/15",
    },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20" />
      {colorfulCircles.map((circle) => (
        <div
          key={circle.id}
          className={`absolute rounded-full bg-gradient-to-br ${circle.color} blur-xl`}
          style={{
            width: circle.size,
            height: circle.size,
            left: `${circle.x}%`,
            top: `${circle.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
};

export default AnimatedBackground;
