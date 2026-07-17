export function isLocalDemoMode() {
  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_LOCAL_DEMO === "true";
}
