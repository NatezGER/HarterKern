export function needsExactNavigationMatch(href: string, pathname: string) {
  return href === "/events" &&
    (pathname === "/events/live" || pathname.startsWith("/events/live/"));
}
