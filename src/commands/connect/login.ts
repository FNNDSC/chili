import { connect_do, ConnectOptions } from "@fnndsc/salsa";

/**
 * Handles the login process.
 *
 * @param options - Connection options.
 */
export async function login_do(options: ConnectOptions): Promise<void> {
  try {
    await connect_do(options);
  } catch (error) {
    console.error("Failed to connect:", error);
  }
}
