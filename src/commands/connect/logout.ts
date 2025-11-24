import { logout_do as salsa_logout } from "@fnndsc/salsa";

/**
 * Handles the logout process.
 */
export async function logout_do(): Promise<void> {
  await salsa_logout();
}
