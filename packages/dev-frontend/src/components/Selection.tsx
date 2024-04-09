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
import { Tooltip } from 'react-tooltip'

const StyledReactTooltip = styled(Tooltip)`
    background-color: white !important; 
    color: #111!important;
    font-size: 32.4px!important;
    line-height: 130%!important;
    font-weight: 600!important;
    font-style: normal!important;
    padding: 15px 26px!important;
    border-radius: 20px!important;
    box-shadow: 0px 2px 20px lightgray;
    z-index:10;
    &:after {
        border-top-color: black !important;
        border-width: 120px !important;
        margin-top: -20px !important;
    }
`;

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

interface ToTheDenProps {
    setShow: (val: boolean) => void;
}

const ToTheDen: React.FC<ToTheDenProps> = props => {
    const { setShow } = props
    return (
        <span className='flex flex-row items-center text-dark-gray text-lg font-medium cursor-pointer' onClick={() => setShow(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
                <path d="M0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711L6.65685 15.0711C7.04738 15.4616 7.68054 15.4616 8.07107 15.0711C8.46159 14.6805 8.46159 14.0474 8.07107 13.6569L2.41421 8L8.07107 2.34315C8.46159 1.95262 8.46159 1.31946 8.07107 0.928932C7.68054 0.538408 7.04738 0.538408 6.65685 0.928932L0.292893 7.29289ZM16.5 7H1V9H16.5V7Z" fill="white" />
            </svg>
            &nbsp;Back to the Den
        </span>
    )
}

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
                        <AnimatedDiv className='fixed w-full h-full min-h-full text-center z-5 pt-pt-150px text-5xl font-bold'>The Den</AnimatedDiv>
                        <div className={`overflow-y-auto w-full h-full bg-cover bg-no-repeat z-1 bg-bottom-20 md:bg-bottom-15 lg:bg-bottom-10 ${(showTrove || showStability) ? "bg-gray-black" : "bg-bear bg-dark-orange "}`}>
                            <div className='w-full h-full min-h-lg' style={{ background: "linear-gradient(180deg, #050402 0%, rgba(13, 7, 2, 0.00) 50%)" }}>
                                <div className="flex h-full flex-col min-h-full pb-pb-192px sm:pb-pb-30px lg:pb-20 max-w-8xl mx-auto">
                                    <div className="flex z-[5] flex-row justify-between px-5 md:px-10 lg:px-px-60px py-3">
                                        <BeraBorrowLogo />
                                        <UserAccount />
                                    </div>
                                    <div className={`flex flex-col lg:flex-row items-start lg:items-end bottom-30px lg:bottom-55px justify-between absolute ${(showTrove || showStability) ? "px-0" : "px-0 sm:px-12"} lg:px-16 w-full max-w-8xl`}>
                                        <div className={`w-full flex flex-row justify-start relative ${showTrove ? "" : "-left-8 sm:left-auto"}`}>
                                            <div className={`flex flex-col z-[3] ${showTrove ? "fixed lg:sticky top-[100px] lg:top-auto w-full" : ""}`}>
                                                <div className={`flex flex-col text-white z-[4] ${showTrove ? "animate-fade-show px-10 lg:px-0 hidden lg:block" : "hidden"}`}>
                                                    <ToTheDen setShow={(val: any) => setShowTrove(val)} />
                                                    <span className={`text-7xl font-extrabold ${showTrove ? "hidden lg:block" : "block"}`}>Borrow</span>
                                                </div>
                                                <div
                                                    onMouseEnter={() => setHoverBear(true)}
                                                    onMouseLeave={() => setHoverBear(false)}
                                                    onClick={onShowTrove}
                                                    className={`flex flex-row items-start w-9/12 min-w-72 lg:min-w-full h-auto z-[3] cursor-pointer ${(!showTrove && hoverBear) ? "filter-shadow" : ""} ${showTrove ? "hidden" : ""} ${showStability ? "hidden" : ""}`}
                                                >
                                                    <img
                                                        src="/imgs/bear-honey.png"
                                                        data-tooltip-id="borrow-tooltoip"
                                                        data-tooltip-content="Borrow"
                                                        className='w-full h-full'
                                                    />
                                                    <StyledReactTooltip
                                                        id="borrow-tooltoip"
                                                    />
                                                </div>
                                                <img
                                                    src="/imgs/bear-honey.png"
                                                    className={`flex flex-row items-start w-9/12 min-w-72 lg:min-w-full mx-auto lg:mx-0 h-auto z-[3] ${showTrove ? "max-w-400px animate-fade-smaller-bear hidden lg:block" : "cursor-pointer"} ${!showTrove ? "hidden" : "animate-fade-smaller-bear"}`}
                                                />
                                            </div>
                                        </div>
                                        <div className={`w-full flex flex-row justify-end md:z-[5] relative ${showStability ? "" : "-right-10 sm:right-auto"} group`}>
                                            <div className={`flex flex-col items-end ${showStability ? "fixed lg:sticky top-25 lg:top-auto w-full lg:w-screen-1/2 lg:max-w-500px" : ""}`}>
                                                <div className={`flex flex-col self-start text-white z-[5] mb-30px lg:mb-25 ${showStability ? "animate-fade-show px-10 lg:px-0 hidden lg:block" : "hidden"}`}>
                                                    <ToTheDen setShow={(val: any) => setShowStability(val)} />
                                                    <span className={`text-7xl font-extrabold ${showStability ? "hidden lg:block" : "block"}`}>Stability pool</span>
                                                </div>
                                                <div
                                                    onMouseEnter={() => setHoverFish(true)}
                                                    onMouseLeave={() => setHoverFish(false)}
                                                    onClick={onShowStability}
                                                    className={`min-w-250px w-8/12 md:w-10/12 lg:w-full h-auto relative cursor-pointer mb-0 lg:mb-5 ${showTrove ? "hidden" : ""} ${!showStability ? "block" : "hidden animate-fade-bigger-bear lg:animate-fade-smaller-fish"}`}>
                                                    <img
                                                        src="/imgs/lake.png"
                                                        className={`w-full max-w-400px h-auto ${(!showStability && hoverFish) ? "filter-shadow" : ""}`}
                                                        data-tooltip-id="stability-tooltoip"
                                                        data-tooltip-content="Stability pool"
                                                    />
                                                    <StyledReactTooltip
                                                        id="stability-tooltoip"
                                                    />
                                                </div>
                                                <img
                                                    onMouseEnter={() => setHoverFish(true)}
                                                    onMouseLeave={() => setHoverFish(false)}
                                                    onClick={onShowStability}
                                                    src="/imgs/lighter-fish.png" className={`w-380px mx-auto max-w-400px md:w-full h-auto mix-blend-plus-lighter mb-0 lg:mb-5 ${(!showStability && hoverFish) ? "filter-shadow" : ""} ${showTrove ? "hidden" : ""} ${showStability ? "animate-fade-smaller-bear lg:animate-fade-bigger-fish hidden lg:block" : "hidden"}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex flex-row relative h-0 lg:h-full'>
                                        <div className={`w-full lg:w-trove-lg min-w-full overflow-y-auto lg:min-w-trove-lg h-screen-100 lg:h-full relative lg:top-0 px-5 md:px-px-128px lg:px-0 py-30px lg:pr-pr-60px  z-[10] ${showTrove ? "lg:animate-slide-in-right visible" : "invisible"}`}>
                                            <div className={`pb-[30px] ${showTrove ? "block lg:hidden" : ""}`}>
                                                <ToTheDen setShow={(val: any) => setShowTrove(val)} />
                                                <img
                                                    src="/imgs/bear-honey.png"
                                                    className={`flex flex-row items-start w-9/12 min-w-72 lg:min-w-full mx-auto lg:mx-0 h-auto py-[30px]`}
                                                />
                                                <div className='text-center text-dark-gray text-4.5xl not-italic tracking-tight font-bold leading-[130%] py-[30px]'>Borrow</div>
                                            </div>
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
                                        <div className={`w-full lg:w-trove-lg min-w-full overflow-y-auto lg:min-w-trove-lg h-screen-100 lg:h-full relative lg:top-0 px-5 md:px-px-128px lg:px-0 lg:pt-pt-30px lg:pl-pl-60px  z-[3] -left-full ${showStability ? "lg:animate-slide-in-left visible" : "invisible"}`}>
                                            <div className={`pb-[30px] ${showStability ? "block lg:hidden" : ""}`}>
                                                <ToTheDen setShow={(val: any) => setShowStability(val)} />
                                                <img
                                                    src="/imgs/lighter-fish.png"
                                                    className={`w-full mx-auto max-w-400px h-auto mix-blend-plus-lighter mb-0 lg:mb-5 py-[30px]`}
                                                />
                                                <div className='text-center text-dark-gray text-4.5xl not-italic tracking-tight font-bold leading-[130%] py-[30px]'>Stability pool</div>
                                            </div>
                                            {
                                                (stabilityView === "NONE" || stabilityView === "DEPOSITING") ? <StabilityDepositManager {...props} /> :
                                                    (stabilityView === "ADJUSTING") ? <StabilityDepositManager {...props} /> : <StabilityDepositManager {...props} />
                                            }
                                            <div className="my-14px h-0 w-full border-t border-[#BDFAE2]" />
                                            <StabilityStats />
                                        </div>
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