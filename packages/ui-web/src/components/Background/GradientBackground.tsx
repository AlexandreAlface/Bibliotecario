// packages/ui-web/src/components/GradientBackground.tsx
import * as React from "react";
import { styled, alpha } from "@mui/material/styles";
import { Box, type BoxProps } from "@mui/material";

/** ---------- Base ---------- */
interface GradientProps extends BoxProps {
  from?: string;
  to?: string;
  angle?: number;
}

const GradientBackgroundRoot = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== "from" && prop !== "to" && prop !== "angle",
})<GradientProps>(({ theme, from, to, angle = 135 }) => ({
  minHeight: "100vh",
  width: "100%",
  background: `linear-gradient(${angle}deg, ${
    from ?? theme.palette.secondary.main
  } 0%, ${to ?? theme.palette.primary.main} 100%)`,
  position: "relative",
  overflow: "hidden",
}));

/** ---------- Versão com formas ---------- */
type ShapeType = "triangle" | "square" | "circle";

export type GradientWithShapesProps = GradientProps & {
  /** ativa/define quantidade de formas; true=10 (default) */
  decorations?: boolean | number;
  /** semente para posições/rotações determinísticas */
  seed?: number;
  /** tamanho mínimo/máximo (px) das formas */
  minSize?: number;
  maxSize?: number;
  /** cor das formas (default = branco com alpha) */
  shapeColor?: string;
  /** animação de “flutuar” vertical */
  floating?: boolean;
  /** rotação contínua; true = aleatória (default), número = duração (s), false = sem spin */
  spin?: boolean | number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ShapeSpec = {
  type: ShapeType;
  size: number;
  top: number; // %
  left: number; // %
  rotate: number; // deg (posição base)
  opacity: number;
  floatDuration: number; // s
  floatDelay: number; // s
  spinDuration?: number; // s (se definido, roda continuamente)
  spinReverse?: boolean;
};

const ShapesLayer = styled("div")({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
});

/** Wrapper que flutua (translateY) — o filho faz a rotação */
const ShapeWrap = styled("div")({
  position: "absolute",
  willChange: "transform",
});

const Square = styled("div")<{ size: number; color: string }>(
  ({ size, color }) => ({
    position: "absolute",
    width: size,
    height: size,
    background: color,
    borderRadius: 6,
    // rotação (base + spin) por CSS var/anim
    transform: "rotate(var(--rot, 0deg))",
  })
);

const Circle = styled("div")<{ size: number; color: string }>(
  ({ size, color }) => ({
    position: "absolute",
    width: size,
    height: size,
    background: color,
    borderRadius: "50%",
    // roda também (mesmo que não se note visualmente num círculo sólido)
    transform: "rotate(var(--rot, 0deg))",
  })
);

const Triangle = styled("div")<{ size: number; color: string }>(
  ({ size, color }) => ({
    position: "absolute",
    width: 0,
    height: 0,
    borderLeft: `${size / 2}px solid transparent`,
    borderRight: `${size / 2}px solid transparent`,
    borderBottom: `${size}px solid ${color}`,
    transform: "rotate(var(--rot, 0deg))",
  })
);

export function GradientBackgroundWithShapes({
  children,
  decorations = true,
  seed = 1337,
  minSize = 16,
  maxSize = 56,
  shapeColor,
  floating = true,
  spin = true,
  from,
  to,
  angle,
  sx,
  ...rest
}: GradientWithShapesProps) {
  const count = decorations === true ? 10 : decorations === false ? 0 : decorations;

  const shapes = React.useMemo<ShapeSpec[]>(() => {
    const rnd = mulberry32(seed);
    const arr: ShapeSpec[] = [];
    for (let i = 0; i < count; i++) {
      const r = rnd();
      const type: ShapeType = r < 0.34 ? "triangle" : r < 0.67 ? "square" : "circle";
      const size = Math.round(minSize + rnd() * (maxSize - minSize));
      const top = Math.round(rnd() * 92) + 4;
      const left = Math.round(rnd() * 92) + 4;
      const rotate = Math.round(rnd() * 360);
      const opacity = 0.12 + rnd() * 0.14;      // 0.12–0.26
      const floatDuration = 8 + rnd() * 10;     // 8–18s
      const floatDelay = -rnd() * 8;            // arranque desencontrado

      let spinDuration: number | undefined;
      let spinReverse = rnd() < 0.5;
      if (spin) {
        spinDuration =
          typeof spin === "number" ? Math.max(2, spin) : 20 + rnd() * 20; // 20–40s default
      }

      arr.push({
        type,
        size,
        top,
        left,
        rotate,
        opacity,
        floatDuration,
        floatDelay,
        spinDuration,
        spinReverse,
      });
    }
    return arr;
  }, [count, minSize, maxSize, seed, spin]);

  return (
    <GradientBackgroundRoot from={from} to={to} angle={angle} sx={sx} {...rest}>
      {/* Layer de formas */}
      <ShapesLayer>
        {shapes.map((s, i) => {
          // wrapper: posição + flutuar (translateY)
          const wrapStyle: React.CSSProperties = {
            top: `${s.top}%`,
            left: `${s.left}%`,
            opacity: s.opacity,
            animation: floating
              ? `floatY ${s.floatDuration}s ease-in-out ${s.floatDelay}s infinite alternate`
              : undefined,
          };

          // forma: rotação base + spin (na mesma propriedade transform)
          const innerStyle: React.CSSProperties = {
            // CSS var com a rotação base
            ["--rot" as any]: `${s.rotate}deg`,
            animation: s.spinDuration ? `spin var(--spinDur) linear infinite` : undefined,
            // passar a duração do spin por var para poder variar por elemento
            ["--spinDur" as any]: s.spinDuration ? `${s.spinDuration}s` : undefined,
            animationDirection: s.spinReverse ? "reverse" : "normal",
          };

          // cor suave por defeito
          const color =
            shapeColor ?? alpha("#fff", Math.min(s.opacity + 0.05, 0.35));

          return (
            <ShapeWrap key={i} style={wrapStyle}>
              {s.type === "square" && (
                <Square size={s.size} color={color} style={innerStyle} />
              )}
              {s.type === "circle" && (
                <Circle size={s.size} color={color} style={innerStyle} />
              )}
              {s.type === "triangle" && (
                <Triangle size={s.size} color={color} style={innerStyle} />
              )}
            </ShapeWrap>
          );
        })}
      </ShapesLayer>

      {/* conteúdo acima das formas */}
      <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>

      {/* keyframes locais */}
      <style>{`
        @keyframes floatY {
          from { transform: translateY(0) }
          to   { transform: translateY(-10px) }
        }
        /* 'spin' respeita a rotação base através da CSS var --rot */
        @keyframes spin {
          from { transform: rotate(var(--rot, 0deg)); }
          to   { transform: rotate(calc(var(--rot, 0deg) + 360deg)); }
        }
      `}</style>
    </GradientBackgroundRoot>
  );
}

export { GradientBackgroundRoot as GradientBackground };
