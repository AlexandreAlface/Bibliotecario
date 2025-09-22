import * as React from "react";
import { Box, type BoxProps } from "@mui/material";
import logoBiblioUrl from "./LogoBiblio.svg";
import logoBFUrl from "./AF_Logo_BF.svg";

type LogoVariant = "biblio" | "bf";

export interface LogoProps extends Omit<BoxProps, "component"> {
  /** texto alternativo do <img> */
  alt?: string;
  /** qual logo usar por omissão (podes sobrepor com `src`) */
  variant?: LogoVariant;
  /** se quiseres forçar um SVG/URL específico */
  src?: string;
}

export const Logo: React.FC<LogoProps> = ({
  alt = "Bibliotecário",
  variant = "biblio",
  src: srcProp,
  sx,
  ...rest
}) => {
  const src = srcProp ?? (variant === "bf" ? logoBFUrl : logoBiblioUrl);

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={[
        {
          display: "block",
          height: "100%",     // ocupa a altura do contentor
          width: "auto",      // mantém proporção
          objectFit: "contain",
          objectPosition: "left center",
          lineHeight: 0,
          flexShrink: 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
};

/** atalhos convenientes, caso queiras importar direto */
export const BiblioLogo: React.FC<Omit<LogoProps, "variant">> = (p) => (
  <Logo variant="biblio" {...p} />
);
export const FamilyLogo: React.FC<Omit<LogoProps, "variant">> = (p) => (
  <Logo variant="bf" {...p} />
);
