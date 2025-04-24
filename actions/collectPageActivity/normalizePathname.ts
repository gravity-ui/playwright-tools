// убираем последний '/'
// для случая, если pathname не был указан в урле, т.к. по дефолту он равен '/'
// для случая, если сравнивается '/search' с '/search/'
export const normalizePathname = (pathname: string) => pathname.replace(/\/$/, '');
