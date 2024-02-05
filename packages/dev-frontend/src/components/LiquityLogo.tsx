import React from "react";
import { Box, Image } from "theme-ui";

type LiquityLogoProps = React.ComponentProps<typeof Box> & {
  height?: number | string;
};

export const LiquityLogo: React.FC<LiquityLogoProps> = ({ height, ...boxProps }) => (
  <div sx={{ lineHeight: 0 }} {...boxProps}>
    <Image src="./beraborrow-logo.png" sx={{ height: "51px", width: "51px", borderRadius: "50%", backgroundColor: '#EC6F15' }} />
  </div>
);
