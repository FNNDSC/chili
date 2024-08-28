// src/screen/screen.ts

import Table from "cli-table3";
import { table, getBorderCharacters, TableUserConfig } from "table";
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
    let tableData: string[][];
    let headers: string[] = options.head || ["Plugin Parameter", "Value"];

    if (Array.isArray(data)) {
      tableData = data as string[][];
    } else if (typeof data === "object" && data !== null) {
      tableData = Object.entries(data).map(([key, value]) => [
        chalk.yellow(key),
        chalk.cyan(String(value)),
      ]);
    } else {
      console.log(data);
      return;
    }

    // Add headers as the first row of data with different colors
    tableData.unshift([
      chalk.yellow.bold(headers[0]),
      chalk.cyan.bold(headers[1]),
    ]);

    const config: TableUserConfig = {
      border: getBorderCharacters("norc"),
      columns: [
        { alignment: "right", width: options.colWidths?.[0] },
        { alignment: "left", width: options.colWidths?.[1] },
      ],
      drawHorizontalLine: (index: number, size: number) =>
        index === 0 || index === 1 || index === size,
    };

    const output = table(tableData, config);
    console.log(output);
  }

  table_cli(data: any[] | Object, options: TableOptions = {}): void {
    let rowData: any[][];
    let headers: string[] | undefined;

    // console.log("Input data:", JSON.stringify(data, null, 2));

    if (Array.isArray(data)) {
      //   console.log("Data is an array");
      if (data.length === 0) {
        console.log("(empty array)");
        return;
      }
      if (Array.isArray(data[0])) {
        // console.log("Data is an array of arrays");
        rowData = data;
        headers = options.head || ["Plugin Parameter", "Value"];
      } else if (typeof data[0] === "object" && data[0] !== null) {
        console.log("Data is an array of objects");
        headers = options.head || Object.keys(data[0]);
        rowData = data.map((item) =>
          headers!.map((header) => item[header] ?? "")
        );
      } else {
        console.log("Data is an array of primitives");
        rowData = data.map((item) => [item]);
      }
    } else if (typeof data === "object" && data !== null) {
      console.log("Data is an object");
      headers = options.head || ["Plugin Parameter", "Value"];
      rowData = Object.entries(data);
    } else {
      console.log("Data is neither an array nor an object");
      console.log(data);
      return;
    }

    // console.log("Processed rowData:", JSON.stringify(rowData, null, 2));

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
        right: "║",
        middle: "│",
        "left-mid": "╟",
        mid: "─",
        "mid-mid": "┼",
        "right-mid": "╢",
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
    // console.log("Table object:", table);

    console.log(table.toString());
  }

  clear(): void {
    console.clear();
  }
}

export const screen = new Screen();
