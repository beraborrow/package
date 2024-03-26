import { useEffect, useState } from "react";
import { AddressZero } from "@ethersproject/constants";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { useBeraBorrow } from "../hooks/BeraBorrowContext";

import { Dashboard } from "./Dashboard";
import { UnregisteredFrontend } from "./UnregisteredFrontend";
import { FrontendRegistration } from "./FrontendRegistration";
import { FrontendRegistrationSuccess } from "./FrontendRegistrationSuccess";

const selectFrontend = ({ frontend }: BeraBorrowStoreState) => frontend;

export const PageSwitcher: React.FC = () => {
  const {
    account,
    config: { frontendTag }
  } = useBeraBorrow();

  const frontend = useBeraBorrowSelector(selectFrontend);
  const unregistered = frontendTag !== AddressZero && frontend.status === "unregistered";

  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (unregistered) {
      setRegistering(true);
    }
  }, [unregistered]);

  if (registering || unregistered) {
    if (frontend.status === "registered") {
      return <FrontendRegistrationSuccess onDismiss={() => setRegistering(false)} />;
    } else if (account === frontendTag) {
      return <FrontendRegistration />;
    } else {
      return <UnregisteredFrontend />;
    }
  } else {
    return <Dashboard />;
  }
};
