import React, { useEffect, useState, useRef } from "react";

const BubblePopGame = () => {
  const [bubbles, setBubbles] = useState([]);
  const [score, setScore] = useState(0);
  const gameAreaRef = useRef();
  const bubbleId = useRef(0);
  const [poppedBubbles, setPoppedBubbles] = useState([]);
  const popSoundRef = useRef(null);

  // Generate a new bubble every 800ms
  useEffect(() => {
    const interval = setInterval(() => {
      const newBubble = {
        id: bubbleId.current++,
        x: Math.random() * 90 + 5, // % from left
        size: Math.random() * 30 + 20, // px
        speed: Math.random() * 2 + 1, // float upward speed
      };
      setBubbles((prev) => [...prev, newBubble]);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Animate bubbles upward
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) =>
        prev
          .map((b) => ({ ...b, y: (b.y || 0) + b.speed }))
          .filter((b) => (b.y || 0) < 100) // remove if off screen
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handlePop = (id) => {
    const popped = bubbles.find((b) => b.id === id);
    if (popped) {
      setPoppedBubbles((prev) => [...prev, popped]);
    }
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    setScore((prev) => prev + 1);
    if (popSoundRef.current) {
      popSoundRef.current.currentTime = 0;
      popSoundRef.current.play();
    }
  };

  // Remove popped bubbles after animation
  useEffect(() => {
    if (poppedBubbles.length > 0) {
      const timer = setTimeout(() => {
        setPoppedBubbles([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [poppedBubbles]);

  return (
    <div
      ref={gameAreaRef}
      style={{
        position: "relative",
        width: 300,
        height: 400,
        overflow: "hidden",
        backgroundColor: '#1E1E2E', //`linear-gradient(to right, #242424, #1E1E2E)`, //"#111",
        borderRadius: 8,
        border: "1px solid #333",
      }}
    >
      <audio ref={popSoundRef} src="/assets/sounds/bubble-pop.mp3" preload="auto" />

      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          color: "white",
          fontWeight: "bold",
        }}
      >
        Score: {score}
      </div>

      {/* Floating bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          onClick={() => handlePop(bubble.id)}
          style={{
            position: "absolute",
            left: `calc(${bubble.x}% - 10px)`, // offset to help with click area
            bottom: `${bubble.y || 0}%`,
            width: bubble.size + 10, // larger clickable area
            height: bubble.size + 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundColor: "transparent",
            position: "absolute",
          }}
        >
          <div
            style={{
              width: bubble.size,
              height: bubble.size,
              backgroundColor: "rgba(135,206,250,0.7)",
              borderRadius: "50%",
              boxShadow: "0 0 5px #9cf",
            }}
          />
        </div>
      ))}

      {/* Bubble pop animations */}
      {poppedBubbles.map((bubble) => (
        <div
          key={`popped-${bubble.id}`}
          style={{
            position: "absolute",
            left: `calc(${bubble.x}% - 10px)`,
            bottom: `${bubble.y || 0}%`,
            width: bubble.size + 20,
            height: bubble.size + 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: bubble.size,
              height: bubble.size,
              backgroundColor: "rgba(255,255,255,0.4)",
              borderRadius: "50%",
              animation: "pop 0.3s ease-out",
            }}
          />
        </div>
      ))}

      {/* Pop animation style */}
      <style>
        {`
          @keyframes pop {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
};

export default BubblePopGame;
