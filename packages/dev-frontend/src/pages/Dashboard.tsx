import { useState } from 'react'

import { Trove } from "../components/Trove/Trove";
import { Stability } from "../components/Stability/Stability";

export const Dashboard: React.FC = () => {
  const [curPage, setCurPage] = useState ("Borrow")

  return (
    <div className="flex flex-col w-full sm:gap-8 px-0 sm:px-[100px] lg:px-0 gap-8">
      <div className="flex flex-row items-center justify-center gap-8 text-lg px-5 py-[17px] border border-[#FFEDD4] rounded-[40px] mt-10 mx-auto">
          <span
            onClick={() => setCurPage("Borrow")}
            className={`${curPage === "Borrow" ? "text-dark-gray font-bold leading-6" : "font-medium opacity-50"} cursor-pointer`}
          >Borrow</span>
          <span
            onClick={() => setCurPage("Stability")} 
            className={`${curPage === "Stability" ? "text-dark-gray font-bold leading-6" : "font-medium opacity-50"} cursor-pointer`}
          >Stability pool</span>
          {/* <span
            onClick={() => setCurPage("Investors")} 
            className={`${curPage === "Investors" ? "text-dark-gray font-bold leading-6" : "font-medium opacity-50"} cursor-pointer`}
          >Investors</span> */}
      </div>
      {
        curPage === "Borrow" ? <Trove /> : <Stability />
      }
    </div>
  )
};
