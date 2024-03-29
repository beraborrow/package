import React from "react";
import { Container, Flex } from "theme-ui";

import { BeraBorrowLogo } from "./BeraBorrowLogo";

const logoHeight = "51px";

export const Header: React.FC = ({ children }) => {

  return (
    <Container variant="header">
      <Flex sx={{ alignItems: "center", flex: 1 }}>
        <BeraBorrowLogo height={logoHeight} />

        {/* <Box
          sx={{
            mx: [2, 3],
            width: "0px",
            height: "100%",
            borderLeft: ["none", "1px solid lightgrey"]
          }}
        />
        {isFrontendRegistered && (
          <>
            <SideNav />
            <Nav />
          </>
        )} */}
      </Flex>

      {children}
    </Container>
  );
};
