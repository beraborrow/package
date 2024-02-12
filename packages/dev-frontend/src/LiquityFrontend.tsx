import React, { useContext } from "react";
import { Flex, Container } from "theme-ui";
import { HashRouter as Router, Switch, Route } from "react-router-dom";
import { Wallet } from "@ethersproject/wallet";

import { Decimal, Difference, Trove } from "@liquity/lib-base";
import { LiquityStoreProvider } from "@liquity/lib-react";

import { useLiquity } from "./hooks/LiquityContext";
import { TransactionMonitor } from "./components/Transaction";
import { UserAccount } from "./components/UserAccount";
import { LiquityLogo } from "./components/LiquityLogo";

import { PageSwitcher } from "./pages/PageSwitcher";
import { RiskyTrovesPage } from "./pages/RiskyTrovesPage";
import { Bonds } from "./pages/Bonds";

import { TroveViewProvider } from "./components/Trove/context/TroveViewProvider";
import { StabilityViewProvider } from "./components/Stability/context/StabilityViewProvider";
import { StakingViewProvider } from "./components/Staking/context/StakingViewProvider";
import "tippy.js/dist/tippy.css"; // Tooltip default style
import { BondsProvider } from "./components/Bonds/context/BondsProvider";

import { CurPageContext } from "./contexts/CurPageContext";
import Home from "./components/Home";
import Selection from "./components/Selection";

type LiquityFrontendProps = {
  loader?: React.ReactNode;
};
export const LiquityFrontend: React.FC<LiquityFrontendProps> = ({ loader }) => {
  const { account, provider, liquity } = useLiquity();

  const curPageContext = useContext (CurPageContext)

  if (!curPageContext) {
      throw new Error('YourComponent must be used within a CurPageContext.Provider');
  }

  const { curPage, setCurPage } = curPageContext;

  // For console tinkering ;-)
  Object.assign(window, {
    account,
    provider,
    liquity,
    Trove,
    Decimal,
    Difference,
    Wallet
  });

  return (
    <LiquityStoreProvider {...{ loader }} store={liquity.store}>
      <Router>
        <TroveViewProvider>
          <StabilityViewProvider>
            <StakingViewProvider>
              <BondsProvider>
                {
                  curPage === 0 ? <Home /> : 
                  (curPage === 2 || curPage === 3 || curPage === 4) ? <Selection /> : 
                  <div className="flex flex-col min-h-full pb-[192px] sm:pb-[166px] bg-main-gradient">
                    <div className="flex flex-row justify-between px-5 md:px-10 lg:px-[60px] py-[15px]">
                      <LiquityLogo />
                      <UserAccount />
                    </div>
                    <div className="bg-[#1D0D76] text-lg font-normal p-5 text-center text-dark-gray">Currently in simple mode. Click here to &nbsp;
                      <span className="underline cursor-pointer" onClick={() => setCurPage(2)}>travel to the Den</span>
                    </div>
                    <Switch>
                      <Route path="/" exact>
                        <PageSwitcher />
                      </Route>
                    </Switch>
                  </div>
                }
                
              </BondsProvider>
            </StakingViewProvider>
          </StabilityViewProvider>
        </TroveViewProvider>
      </Router>
      <TransactionMonitor />
    </LiquityStoreProvider>
  );
};
