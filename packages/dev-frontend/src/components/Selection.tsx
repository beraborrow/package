import { useState, useContext } from 'react'

import styled, { keyframes } from "styled-components";

import { UserAccount } from "../components/UserAccount";
import { LiquityLogo } from "../components/LiquityLogo";
import { CurPageContext } from '../contexts/CurPageContext';

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

const Selection: React.FC = () => {
    
    const curPageContext = useContext (CurPageContext)

    if (!curPageContext) {
        throw new Error('YourComponent must be used within a CurPageContext.Provider');
    }

    const { curPage, setCurPage } = curPageContext;

    const [hoverBear, setHoverBear] = useState (false)
    const [hoverFish, setHoverFish] = useState (false)
    
    return (
        <>
            <AnimatedDiv className='fixed w-full h-full text-center z-5 pt-[150px] text-[48px] font-bold'>The Den</AnimatedDiv>
            <div className='fixed w-full h-[50%]' style={{background: "linear-gradient(180deg, #050402 0%, rgba(13, 7, 2, 0.00) 100%)"}} />
            <div className="w-full h-full bg-bear bg-cover bg-center">
                <div className="flex flex-col min-h-full pb-[192px] sm:pb-[166px]">
                    <div className="flex z-[5] flex-row justify-between px-5 md:px-10 lg:px-[60px] py-[15px]">
                        <LiquityLogo />
                        <UserAccount />
                    </div>
                    <div className="flex flex-col lg:flex-row items-start lg:items-end bottom-[30px] lg:bottom-[55px] justify-between absolute px-0 md:px-12 lg:px-16 w-full">
                        <div className="w-full flex flex-row justify-start relative -left-[32px] md:left-auto">
                            <img
                                onMouseEnter={()=> setHoverBear(true)}
                                onMouseLeave={()=> setHoverBear(false)}
                                onClick={() => setCurPage(3)}
                                src="/imgs/bear-honey.png" className={`flex flex-row items-start w-[365px] md:w-[536px] h-[271px] md:h-[410px] cursor-pointer peer ${(curPage === 2 && hoverBear)?"filter-shadow": ""} ${curPage === 2 ? "fadeBearFromSmallToBig" : ""}`}
                            />
                            <img
                                src="/imgs/borrowing-arrow.png" className={`w-[250px] h-[114px] relative -top-[150px] -left-[50%] invisible ${curPage === 2 ? "peer-hover:visible": ""}`}
                            />
                        </div>
                        <div className="w-full flex flex-row justify-end relative -right-[80px] md:right-auto group">
                            <img src="/imgs/stability-arrow.png" className={`w-[262px] h-[114px] relative -top-[150px] -right-[50%] invisible ${curPage === 2 ? "group-hover:visible": ""}`}/>
                            <img
                                onMouseEnter={()=> setHoverFish(true)}
                                onMouseLeave={()=> setHoverFish(false)} 
                                onClick={() => setCurPage(4)}
                                src="/imgs/fish.png" className={`w-[380px] md:w-[400px] h-[158px] md:h-[165px] mix-blend-color-burn mb-0 lg:mb-5 cursor-pointer ${(curPage === 2 && hoverFish)?"filter-shadow": ""}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Selection