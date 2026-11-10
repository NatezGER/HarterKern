import { createContext } from "react";
export const BeerAvatarContext = createContext<Record<string,string | null>>({});
