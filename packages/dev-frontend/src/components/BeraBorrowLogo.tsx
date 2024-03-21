import React from "react";
import { Box, Image } from "theme-ui";

type BeraBorrowLogoProps = React.ComponentProps<typeof Box> & {
  height?: number | string;
};

export const BeraBorrowLogo: React.FC<BeraBorrowLogoProps> = ({ height, ...boxProps }) => (
  <div sx={{ lineHeight: 0 }} {...boxProps}>
    <a href="/"><Image src="./beraborrow-logo.png" sx={{ height: "51px", width: "51px", borderRadius: "50%", backgroundColor: '#EC6F15' }} /></a>
  </div>
);
