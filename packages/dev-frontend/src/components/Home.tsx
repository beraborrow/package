import { useState, useContext } from 'react'
import { CurPageContext } from '../contexts/CurPageContext'

const Home: React.FC = () => {
    const [hoverSimple, setHoverSimple] = useState (false)
    const [hoverDen, setHoverDen] = useState (false)

    const curPageContext = useContext (CurPageContext)

    if (!curPageContext) {
        throw new Error('YourComponent must be used within a CurPageContext.Provider');
    }

    const { setCurPage } = curPageContext;

    return (
        <div className="w-full h-full bg-main-gradient">
            <div className="mx-auto pt-[60px] md:pt-[177px] pb-[50px]">
                <div className="text-[48px] font-bold leading-[130%] -tracking-[1.44px] text-white text-center">Choose your experience</div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-5 lg:gap-[60px] mt-[60px] md:mt-[98px]">
                    <div className="flex flex-col gap-8">
                        <img
                            onClick={() => setCurPage(1)} 
                            onMouseEnter={() => setHoverSimple(true)}
                            onMouseLeave={() => setHoverSimple(false)}
                            src="/imgs/simple.png" 
                            className={`cursor-pointer w-[271px] lg:w-[374px] h-[200px] md:h-[298px] rounded-[20px] border border-white hover:border-[#EC6F15] ${hoverSimple?"den-window-shadow":""}`}
                        />
                        <span className="text-[32px] text-dark-gray font-medium leading-[130%] text-center">Simple</span>
                    </div>
                    <div className="flex flex-col gap-8">
                        <img
                            onClick={() => setCurPage(2)} 
                            onMouseEnter={() => setHoverDen(true)}
                            onMouseLeave={() => setHoverDen(false)}
                            src="/imgs/den.png"
                            className={`cursor-pointer w-[271px] lg:w-[374px] h-[200px] md:h-[298px] rounded-[20px] border border-white hover:border-[#EC6F15] ${hoverDen?"den-window-shadow":""}`}
                        />
                        <span className="text-[32px] text-dark-gray font-medium leading-[130%] text-center">The Den</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home