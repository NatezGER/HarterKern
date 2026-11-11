import { expect, it } from "vitest";
import { rankPlayerBeers, type BeerRankingMode } from "./playerBeerRanking";
const brands = [
 {brand:"B",imagePath:null,attempts:3,bestHundredths:200,worstHundredths:900,averageHundredths:500},
 {brand:"A",imagePath:"a.png",attempts:1,bestHundredths:250,worstHundredths:250,averageHundredths:250},
 {brand:"C",imagePath:null,attempts:2,bestHundredths:300,worstHundredths:400,averageHundredths:350},
];
it.each<[BeerRankingMode,string[]]>([
 ["fastest",["B","A","C"]], ["slowest",["B","C","A"]],
 ["bestAverage",["A","C","B"]], ["worstAverage",["B","C","A"]], ["most",["B","C","A"]],
])("sorts %s from the full personal aggregate without changing the source",(mode,expected)=>{
 expect(rankPlayerBeers(brands,mode).map(b=>b.brand)).toEqual(expected);
 expect(brands.map(b=>b.brand)).toEqual(["B","A","C"]);
});
it("breaks ties by brand and retains single-attempt brands and image paths",()=>{
 const ties=[{...brands[0],brand:"Z"},{...brands[0],brand:"A"}];
 expect(rankPlayerBeers(ties,"most").map(b=>b.brand)).toEqual(["A","Z"]);
 expect(rankPlayerBeers([brands[1]],"slowest")).toEqual([brands[1]]);
 expect(rankPlayerBeers([],"fastest")).toEqual([]);
});
