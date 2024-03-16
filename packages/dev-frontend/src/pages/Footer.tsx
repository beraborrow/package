export const Footer: React.FC = () => {
    return (
        <div className="fixed bottom-0 w-full flex flex-row items-center justify-between bg-[#EC6F15] px-5 md:px-[60px] mt-[42px]">
            <div className="flex flex-row items-center text-[35px] font-medium gap-2 text-[#0B1722] py-[14px]">
                <img src="./beraborrow-logo.png" className="w-[51px] h-[51px] rounded-full border border-white" />
            </div>
            <div className="flex flex-row items-center justify-center gap-5 py-[9px]">
                <a href="https://twitter.com/Fluid_xyz" target="_blank"><img src="./icons/x.png" className="w-8 h-8" /></a>
                <a href="https://t.me/fluidxyz" target="_blank"><img src="./icons/telegram.png" className="w-8 h-8" /></a>
                <a href="https://github.com/thefluidxyz/package" target="_blank"><img src="./icons/github.png" className="w-8 h-8" /></a>
                <a href="https://thefluid.gitbook.io/docs" target="_blank"><img src="./icons/documentation.png" className="w-8 h-8" /></a>
            </div>
        </div>
    )
}