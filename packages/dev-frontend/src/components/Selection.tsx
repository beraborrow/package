import { useState } from 'react'

import styled, { keyframes } from "styled-components";

import { UserAccount } from "../components/UserAccount";
import { BeraBorrowLogo } from "./BeraBorrowLogo";
import { useTroveView } from "./Trove/context/TroveViewContext";
import { useStabilityView } from "./Stability/context/StabilityViewContext";

import { TroveManager } from "./Trove/TroveManager";
import { ReadOnlyTrove } from "./Trove/ReadOnlyTrove";
import { Borrow } from "./Trove/Borrow";
import { Opening } from "./Trove/Opening";
import { ReadOnlyStats } from "./Trove/ReadOnlyStats";
import { StabilityDepositManager } from "./Stability//StabilityDepositManager";
import { StabilityStats } from "./Stability//StabilityStats";

import { Decimal } from "@beraborrow/lib-base";
import { AppLoader } from "../components/AppLoader";

const appearFromHide = keyframes`
  0% {
    background: rgba(0,0,0,1);
    opacity: 1;
  }
  30% {
    background: rgba(0,0,0,1);
    opacity: 0.7;
  }
  70% {
    background: rgba(0,0,0,0.4)
    opacity: 0.4;
  }
  100% {
    background: rgba(0,0,0,0);
    opacity: 0;
  }
`;

const AnimatedDiv = styled.div`
  animation: ${appearFromHide}
    5s ease-in-out forwards;
`;

const Selection: React.FC = props => {
    const { view: troveView } = useTroveView();
    const { view: stabilityView } = useStabilityView();

    const [hoverBear, setHoverBear] = useState(false)
    const [hoverFish, setHoverFish] = useState(false)
    const [showTrove, setShowTrove] = useState(false)
    const [showStability, setShowStability] = useState(false)

    const [loaded, setLoaded] = useState(false)

    const onShowTrove = () => {
        setShowTrove(true);
        setShowStability(false);
    }

    const onShowStability = () => {
        setShowStability(true);
        setShowTrove(false);
    }

    return (
        <>
            <img className='hidden' src='/imgs/background.png' onLoad={() => setLoaded(true)} />
            {
                !loaded ? <AppLoader /> :
                    <>
                        <AnimatedDiv className='fixed w-full h-full text-center z-5 pt-[150px] text-[48px] font-bold'>The Den</AnimatedDiv>
                        <div className={`w-full h-full fixed bg-cover bg-no-repeat z-1 bg-bottom-50 ${(showTrove || showStability) ? "bg-[#111]" : "bg-bear bg-[#AF8765] "}`}>
                            <div className="flex h-full flex-col min-h-full pb-[192px] sm:pb-[30px] lg:pb-[80px] max-w-[1440px] mx-auto" style={{ background: "linear-gradient(180deg, #050402 0%, rgba(13, 7, 2, 0.00) 50%)" }}>
                                <div className="flex z-[5] flex-row justify-between px-5 md:px-10 lg:px-[60px] py-3">
                                    <BeraBorrowLogo />
                                    <UserAccount />
                                </div>
                                <div className={`flex flex-col lg:flex-row items-start lg:items-end bottom-[30px] lg:bottom-[55px] justify-between absolute ${(showTrove || showStability) ? "px-0" : "px-0 md:px-12"} lg:px-16 w-full max-w-[1440px]`}>
                                    <div className={`w-full flex flex-row justify-start relative ${showTrove ? "" : "-left-[32px] md:left-auto"}`}>
                                        <div className={`flex flex-col z-[3] ${showTrove ? "fixed lg:sticky top-[100px] lg:top-auto w-full" : ""}`}>
                                            <div className={`flex flex-col text-white z-[4] ${showTrove ? "animate-fade-show px-10 lg:px-0" : "invisible"}`}>
                                                <span className='flex flex-row items-center text-dark-gray text-lg font-medium cursor-pointer' onClick={() => setShowTrove(false)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                                                        <path d="M0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292893 7.29289ZM16.5 7H1V9H16.5V7Z" fill="white" />
                                                    </svg>
                                                    &nbsp;Back to the Den
                                                </span>
                                                <span className={`text-[72px] font-extrabold ${showTrove ? "hidden lg:block" : "block"}`}>Borrow</span>
                                            </div>
                                            <img
                                                onMouseEnter={() => setHoverBear(true)}
                                                onMouseLeave={() => setHoverBear(false)}
                                                onClick={onShowTrove}
                                                src="/imgs/bear-honey.png" className={`flex flex-row mx-auto items-start min-w-[365px] w-7/12 lg:min-w-full h-auto z-[3] -mb-[250px] md:-mb-[100px] lg:mb-0 ${(!showTrove && hoverBear) ? "filter-shadow" : ""} ${showTrove ? "animate-fade-smaller-bear" : "cursor-pointer"} ${showStability ? "invisible" : "visible"}`}
                                            />
                                        </div>
                                        <img
                                            src="/imgs/borrowing-arrow.png" className={`w-[233px] h-[90px] relative z-[5] top-[50px] -left-[265px] md:-left-[50%] scale-90 md:scale-100 ${!showTrove && hoverBear ? "animate-fade-show" : "invisible"}`}
                                        />
                                    </div>
                                    <div className={`w-full flex flex-row justify-end md:z-[5] relative ${showStability ? "" : "-right-[80px] md:right-auto"} group`}>
                                        <img src="/imgs/stability-arrow.png" className={`w-[242px] h-[100px] relative top-[70px] md:top-0 lg:top-[70px] -right-[301px] md:-right-[321px] scale-90 md:scale-100 z-[10] ${!showStability && hoverFish ? "animate-fade-show" : "invisible"}`} />
                                        <div className={`flex flex-col ${showStability ? "fixed lg:sticky top-[100px] lg:top-auto w-full lg:w-screen-1/2 lg:max-w-[500px]" : ""}`}>
                                            <div className={`flex flex-col text-white z-[5] mb-[30px] lg:mb-[100px] ${showStability ? "animate-fade-show px-10 lg:px-0" : "invisible"}`}>
                                                <span className='flex flex-row items-center text-dark-gray text-lg font-medium cursor-pointer' onClick={() => { setShowTrove(false); setShowStability(false) }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                                                        <path d="M0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292893 7.29289ZM16.5 7H1V9H16.5V7Z" fill="white" />
                                                    </svg>
                                                    &nbsp;Back to the Den
                                                </span>
                                                <span className={`text-[72px] font-extrabold ${showStability ? "hidden lg:block" : "block"}`}>Stability pool</span>
                                            </div>
                                            <div
                                                onMouseEnter={() => setHoverFish(true)}
                                                onMouseLeave={() => setHoverFish(false)}
                                                onClick={onShowStability}
                                                className={`w-[380px] md:w-full h-auto relative cursor-pointer mb-0 lg:mb-5 ${showTrove ? "invisible" : ""} ${!showStability ? "block" : "hidden animate-fade-bigger-bear lg:animate-fade-smaller-fish"}`}>
                                                <img
                                                    src="/imgs/lake.png" className={`w-[380px] md:w-full max-w-[400px] h-auto ${(!showStability && hoverFish) ? "filter-shadow" : ""}`}
                                                />
                                            </div>
                                            <img
                                                onMouseEnter={() => setHoverFish(true)}
                                                onMouseLeave={() => setHoverFish(false)}
                                                onClick={onShowStability}
                                                src="/imgs/lighter-fish.png" className={`w-[380px] mx-auto max-w-[400px] md:w-full h-auto mix-blend-plus-lighter mb-0 lg:mb-5 ${(!showStability && hoverFish) ? "filter-shadow" : ""} ${showTrove ? "invisible" : ""} ${showStability ? "block animate-fade-smaller-bear lg:animate-fade-bigger-fish" : "hidden"}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className='flex flex-row relative h-0 lg:h-full'>
                                    <div className={`w-full lg:w-trove-lg min-w-full lg:min-w-trove-lg h-[200px] md:h-[450px] lg:h-full relative lg:top-0 px-5 md:px-[128px] lg:px-0 lg:pt-[30px] lg:pr-[60px] overflow-y-auto z-[10] ${showTrove ? "animate-slide-in-top-350 md:animate-slide-in-top-500 lg:animate-slide-in-right visible" : "invisible"}`}>
                                        {
                                            (troveView === "ACTIVE" || troveView === "ADJUSTING") && <Borrow />
                                        }
                                        {
                                            (troveView === "OPENING" || troveView === "LIQUIDATED" || troveView === "NONE" || troveView === "REDEEMED") && <Opening />
                                        }
                                        {
                                            troveView === "CLOSING" && <TroveManager {...props} collateral={Decimal.ZERO} debt={Decimal.ZERO} />
                                        }
                                        <div className="h-0 w-full border-t border-dark-gray my-8" />
                                        <ReadOnlyTrove {...props} />
                                        <div className="h-0 w-full border-t border-dark-gray my-8" />
                                        <ReadOnlyStats {...props} />
                                    </div>
                                    <div className={`w-full lg:w-trove-lg min-w-full lg:min-w-trove-lg h-[300px] md:h-[600px] lg:h-full relative top-0 px-5 md:px-[128px] lg:px-0 lg:pt-[30px] lg:pl-[80px] overflow-y-auto z-[3] -left-[100%] ${showStability ? "animate-slide-in-top-250 md:animate-slide-in-top-300 lg:animate-slide-in-left visible" : "invisible"}`}>
                                        {
                                            (stabilityView === "NONE" || stabilityView === "DEPOSITING") ? <StabilityDepositManager {...props} /> :
                                                (stabilityView === "ADJUSTING") ? <StabilityDepositManager {...props} /> : <StabilityDepositManager {...props} />
                                        }
                                        <div className="my-[14px] h-0 w-full border-t border-[#BDFAE2]" />
                                        <StabilityStats />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
            }

        </>
    )
}

export default Selection