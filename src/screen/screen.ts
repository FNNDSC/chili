// src/screen/screen.ts

import Table from "cli-table3";
import chalk from "chalk";

interface TableOptions {
  colWidths?: number[];
  head?: string[];
}

class Screen {
  log(...args: any[]): void {
    console.log(...args);
  }

  error(...args: any[]): void {
    console.error(chalk.red(...args));
  }

  warn(...args: any[]): void {
    console.warn(chalk.yellow(...args));
  }

  info(...args: any[]): void {
    console.info(chalk.blue(...args));
  }

  table(data: any[] | Object, options: TableOptions = {}): void {
    let rowData: any[][];
    let headers: string[] | undefined;

    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.log("(empty array)");
        return;
      }
      if (typeof data[0] === "object" && data[0] !== null) {
        headers = options.head || Object.keys(data[0]);
        rowData = data.map((item) =>
          headers!.map((header) => item[header] ?? "")
        );
      } else {
        rowData = data.map((item) => [item]);
      }
    } else if (typeof data === "object" && data !== null) {
      headers = options.head || ["Plugin Parameter", "Value"];
      rowData = Object.entries(data);
    } else {
      console.log(data);
      return;
    }

    console.log(`rowdata = ${rowData}`);

    const tableConfig: Table.TableConstructorOptions = {
      chars: {
        top: "═",
        "top-mid": "╤",
        "top-left": "╔",
        "top-right": "╗",
        bottom: "═",
        "bottom-mid": "╧",
        "bottom-left": "╚",
        "bottom-right": "╝",
        left: "║",
        "left-mid": "",
        mid: "",
        "mid-mid": "",
        "right-mid": "",
        right: "║",
        middle: "│",
      },
      style: {
        "padding-left": 1,
        "padding-right": 1,
        head: ["cyan"], // Color the header cyan
      },
    };

    if (options.colWidths) {
      tableConfig.colWidths = options.colWidths;
    }

    if (headers) {
      tableConfig.head = headers;
    }

    const table = new Table(tableConfig);

    rowData.forEach((row) => table.push(row));
    console.log(table);

    console.log(table.toString());
  }

  clear(): void {
    console.clear();
  }
}

export const screen = new Screen();
