import * as readline from "readline";

/**
 * Prompts the user for a yes/no confirmation.
 *
 * @param question - The question to ask.
 * @returns A Promise resolving to true if the user answers 'y', false otherwise.
 */
export async function prompt_confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}
