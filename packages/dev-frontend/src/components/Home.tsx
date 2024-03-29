import { useState } from 'react'
import { useHistory } from 'react-router-dom'

const Home: React.FC = () => {
    const history = useHistory();
    const [hoverSimple, setHoverSimple] = useState (false)
    const [hoverDen, setHoverDen] = useState (false)

    return (
        <div className="w-full h-full bg-main-gradient">
            <div className="mx-auto pt-[60px] md:pt-[177px] pb-[50px]">
                <div className="text-[48px] font-bold leading-[130%] -tracking-[1.44px] text-white text-center">Choose your experience</div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-5 lg:gap-[60px] mt-[60px] md:mt-[98px]">
                    <div className="flex flex-col gap-8">
                        <div
                            onClick={() => history.push('/main')} 
                            onMouseEnter={() => setHoverSimple(true)}
                            onMouseLeave={() => setHoverSimple(false)}
                            className={`bg-transparent cursor-pointer z-[1] w-[271px] lg:w-[374px] h-[200px] md:h-[298px] pt-8 md:pt-[54px] px-[15px] lg:px-[67px] rounded-[20px] border border-white hover:border-[#EC6F15] ${hoverSimple?"den-window-shadow":""}`}
                        >
                            <div className='bg-simple bg-[length:238px_244px] bg-cover bg-no-repeat z-[2] w-full h-full' />
                        </div>
                        <span className="text-[32px] text-dark-gray font-medium leading-[130%] text-center">Simple</span>
                    </div>
                    <div className="flex flex-col gap-8">
                        <div
                            onClick={() => history.push('/den')} 
                            onMouseEnter={() => setHoverDen(true)}
                            onMouseLeave={() => setHoverDen(false)}
                            className={`bg-den bg-[length:375px_327px] lg:bg-cover bg-top-center-14 md:bg-center bg-no-repeat cursor-pointer w-[271px] lg:w-[374px] h-[200px] md:h-[298px] rounded-[20px] border border-white hover:border-[#EC6F15] ${hoverDen?"den-window-shadow":""}`}
                        />
                        <span className="text-[32px] text-dark-gray font-medium leading-[130%] text-center">The Den</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home