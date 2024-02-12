import { createContext } from 'react'

export interface CurPageContextType {
    curPage: number,
    setCurPage: React.Dispatch<React.SetStateAction<number>>
}

export const CurPageContext = createContext<CurPageContextType | undefined>(undefined)
