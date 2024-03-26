import React from "react";
import { useHistory, BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, Difference, Trove } from "@beraborrow/lib-base";
import { BeraBorrowStoreProvider } from "@beraborrow/lib-react";

import { useBeraBorrow } from "./hooks/BeraBorrowContext";
import { TransactionMonitor } from "./components/Transaction";
import { UserAccount } from "./components/UserAccount";
import { BeraBorrowLogo } from "./components/BeraBorrowLogo";

import { PageSwitcher } from "./pages/PageSwitcher";
import { Footer } from "./pages/Footer"
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style
import { BondsProvider } from "./components/Bonds/context/BondsProvider";

import Home from "./components/Home";
import Selection from "./components/Selection";

const MainBoard: React.FC = () => {
  const history = useHistory ()
  return (
    <>
      <div className="flex flex-col min-h-full pb-[192px] sm:pb-[166px] bg-main-gradient">
        <div className="flex flex-row justify-between px-5 md:px-10 lg:px-[60px] py-3">
          <BeraBorrowLogo />
          <UserAccount />
        </div>
        <div className="bg-[#1D0D76] text-lg leading-[18px] font-normal p-5 text-center text-dark-gray">Currently in simple mode. Click here to &nbsp;
          <span className="underline cursor-pointer" onClick={()=>history.push("/den")}>travel to the Den</span>
        </div>
        <PageSwitcher />
      </div>
      <Footer />
    </>
  )
}

type BeraBorrowFrontendProps = {
  loader?: React.ReactNode;
};
export const BeraBorrowFrontend: React.FC<BeraBorrowFrontendProps> = ({ loader }) => {
  const { account, provider, beraborrow } = useBeraBorrow();

  // For console tinkering ;-)
  Object.assign(window, {
    account,
    provider,
    beraborrow,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <BeraBorrowStoreProvider {...{ loader }} store={beraborrow.store}>
      <Router>
        <TroveViewProvider>
          <StabilityViewProvider>
            <StakingViewProvider>
              <BondsProvider>
                <Switch>
                  <Route path="/" exact>
                    <Home />
                  </Route>
                  <Route path="/den" exact>
                    <Selection />
                  </Route>
                  <Route path="/main" exact>
                    <MainBoard />
                  </Route>
                </Switch>
              </BondsProvider>
            </StakingViewProvider>
          </StabilityViewProvider>
        </TroveViewProvider>
      </Router>
      <TransactionMonitor />
      <ToastContainer toastStyle={{ backgroundColor: "#343434" }} />
    </BeraBorrowStoreProvider>
  );
};
