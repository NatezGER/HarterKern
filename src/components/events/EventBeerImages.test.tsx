import { expect,it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventBeerImageList } from "./EventBeerImages";
it("renders distinct bottles with accessible tap and hover labels",()=>{
 const html=renderToStaticMarkup(<EventBeerImageList beers={[{brand:"A",image_path:null},{brand:"B",image_path:null}]} />);
 expect(html.match(/<details/g)).toHaveLength(2);expect(html.match(/<svg/g)).toHaveLength(2);
 expect(html).toContain('title="A"');expect(html).toContain('aria-label="B"');expect(html).toContain('overflow-x-auto');
});
it("does not render an empty gallery",()=>expect(renderToStaticMarkup(<EventBeerImageList beers={[]} />)).toBe(''));
