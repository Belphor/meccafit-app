"use client";

import { useEffect, useId, useRef, useState } from "react";

const BORDER_INSET = 2;
const BORDER_RADIUS = 28;

type ContourSize = {
  width: number;
  height: number;
};

function buildContourRect(size: ContourSize) {
  const width = Math.max(size.width, 1);
  const height = Math.max(size.height, 1);
  const inset = BORDER_INSET;
  const innerWidth = Math.max(width - inset * 2, 1);
  const innerHeight = Math.max(height - inset * 2, 1);
  const radius = Math.min(BORDER_RADIUS, innerWidth / 2, innerHeight / 2);

  return {
    width,
    height,
    x: inset,
    y: inset,
    innerWidth,
    innerHeight,
    radius,
    gradientX2: inset + innerWidth,
    gradientY2: inset + innerHeight,
  };
}

export function ExerciseCardContourTrace() {
  const gradientId = useId().replace(/:/g, "");
  const hostRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState(() => buildContourRect({ width: 1, height: 1 }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sync = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      setRect(buildContourRect({ width, height }));
      setReady(true);
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="exercise-card-contour-host">
      {ready ? (
        <svg
          className="exercise-card-contour-trace"
          width={rect.width}
          height={rect.height}
          viewBox={`0 0 ${rect.width} ${rect.height}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={rect.x}
              y1={rect.y}
              x2={rect.gradientX2}
              y2={rect.gradientY2}
            >
              <stop offset="0%" stopColor="#fef9e7" />
              <stop offset="35%" stopColor="#fde68a" />
              <stop offset="65%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect
            className="exercise-card-contour-line"
            x={rect.x}
            y={rect.y}
            width={rect.innerWidth}
            height={rect.innerHeight}
            rx={rect.radius}
            ry={rect.radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
}
