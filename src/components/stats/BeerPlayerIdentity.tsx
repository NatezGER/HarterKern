import { useContext } from "react";
import { Link } from "react-router-dom";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { BeerAvatarContext } from "./beerAvatarContext";
export function BeerPlayerIdentity({ id, name }: { id: string | null; name: string }) {
 const avatars = useContext(BeerAvatarContext);
 const content = <><ProfileAvatar id={id ?? name} name={name} url={id ? avatars[id] ?? null : null} className="size-8" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{name}</span></>;
 return id ? <Link to={`/player/${id}`} className="inline-flex min-w-0 items-center gap-2 text-gold-200">{content}</Link> : <span className="inline-flex min-w-0 items-center gap-2">{content}</span>;
}
