import type { AppRole } from "./auth";

type RolePath = "/" | "/admin" | "/doctor" | "/reception" | "/patient";

export function dashboardPath(role: AppRole | null): RolePath {
  switch (role) {
    case "admin":
      return "/admin";
    case "doctor":
      return "/doctor";
    case "receptionist":
      return "/reception";
    case "patient":
      return "/patient";
    default:
      return "/";
  }
}
