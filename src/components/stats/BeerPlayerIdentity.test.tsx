import { BeerAvatarContext } from "./beerAvatarContext";
import { expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { BeerPlayerIdentity } from "./BeerPlayerIdentity";
it("keeps avatar, name and profile link together",()=>{
 const html=renderToStaticMarkup(<MemoryRouter><BeerAvatarContext.Provider value={{p:"/avatar.png"}}><BeerPlayerIdentity id="p" name="Paul" /></BeerAvatarContext.Provider></MemoryRouter>);
 expect(html).toContain('/player/p');expect(html).toContain('/avatar.png');expect(html).toContain('Paul');
});
it("uses the existing avatar fallback for guests and missing images",()=>{
 const html=renderToStaticMarkup(<BeerPlayerIdentity id={null} name="Gast" />);
 expect(html).toContain('Profilbild von Gast');expect(html).not.toContain('<img');expect(html).not.toContain('<a ');
});
