/** /system is a development tool. It also renders in a production build when RED_SYSTEM_PAGE=1 (preview deploys). */
export function systemPageEnabled() {
  return process.env.NODE_ENV === "development" || process.env.RED_SYSTEM_PAGE === "1";
}
