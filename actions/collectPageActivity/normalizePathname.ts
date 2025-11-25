// remove the last '/'
// for the case if pathname was not specified in the URL, since by default it is equal to '/'
// for the case if '/search' is compared with '/search/'
export const normalizePathname = (pathname: string) => pathname.replace(/\/$/, '');
