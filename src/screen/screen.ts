import { table, getBorderCharacters, TableUserConfig } from "table";
import chalk from "chalk";

type Justification = "left" | "center" | "right";

export interface ColumnOptions {
  width?: number;
  color?: string;
  justification?: Justification;
}

export interface TableOptions {
  columns?: ColumnOptions[];
  head?: string[];
  typeColors?: {
    number?: string;
    string?: string;
    boolean?: string;
    object?: string;
  };
  title?: Title;
}

interface Title {
  title: string;
  justification?: Justification;
}

interface Borders {
  left?: boolean;
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
}

interface TableContent {
  headers: string[];
  body: any[][];
}

function processTableInput(
  tableData: any[] | string[][] | string[],
  headers: string[] | string
): { processedTableData: any[]; processedHeaders: string[] } {
  let processedTableData: any[];
  let processedHeaders: string[];

  processedHeaders = Array.isArray(headers)
    ? headers
    : headers.split(",").map((h) => h.trim());

  if (
    Array.isArray(tableData) &&
    Array.isArray(tableData[0]) &&
    typeof tableData[0][0] === "string"
  ) {
    // tableData is a string[][]
    processedTableData = tableData.map((row) => {
      return processedHeaders.reduce((rowObj, header, index) => {
        rowObj[header] = row[index];
        return rowObj;
      }, {});
    });
  } else if (Array.isArray(tableData) && typeof tableData[0] === "string") {
    // tableData is a string[]
    processedTableData = tableData.map((rowStr) => {
      const rowValues = rowStr.split(",");
      return processedHeaders.reduce((rowObj, header, index) => {
        rowObj[header] = rowValues[index];
        return rowObj;
      }, {});
    });
  } else {
    // tableData is neither string[][] nor string[]
    processedTableData = tableData as any[];
  }
  return { processedTableData, processedHeaders };
}

function tableContent_pack(
  tableData: any[],
  selectedFields: string[]
): TableContent | null {
  let headers: string[];
  let body: any[][];

  if (Array.isArray(tableData) && tableData.length > 0) {
    headers = selectedFields;
    body = tableData.map((row) =>
      headers.map((field) => (row[field] !== undefined ? row[field] : ""))
    );
  } else {
    console.error("Invalid table data");
    return null;
  }

  return { headers, body };
}

export function drawBorder(text: string, borders: Borders = {}): string {
  const defaultBorders: Required<Borders> = {
    left: true,
    top: true,
    right: true,
    bottom: true,
  };
  const actualBorders: Required<Borders> = { ...defaultBorders, ...borders };

  const lines = text.split("\n");
  const data = lines.map((line) => [line]);
  const config: TableUserConfig = {
    border: getBorderCharacters("norc"),
    columnDefault: {
      paddingLeft: 1,
      paddingRight: 1,
    },
    drawHorizontalLine: (index: number, size: number): boolean =>
      (actualBorders.top && index === 0) ||
      (actualBorders.bottom && index === size),
    drawVerticalLine: (index: number, size: number): boolean =>
      (actualBorders.left && index === 0) ||
      (actualBorders.right && index === 1),
  };
  return table(data, config).trim();
}

function applyFirstColumnSettings(columns: ColumnOptions[]): ColumnOptions[] {
  if (columns.length > 1) {
    return [
      { ...columns[0], justification: "right", color: "white" },
      ...columns.slice(1),
    ];
  }
  return columns;
}

export function displayTable(
  tableData: any[] | string[][] | string[],
  headers: string[] | string,
  options: TableOptions = {}
): TableContent | null {
  const { processedTableData, processedHeaders } = processTableInput(
    tableData,
    headers
  );

  const table: TableContent | null = tableContent_pack(
    processedTableData,
    processedHeaders
  );

  if (!table) {
    return null;
  }

  const columns: ColumnOptions[] = table.headers.map(() => ({
    justification: "left" as const,
  }));
  const updatedColumns = applyFirstColumnSettings(columns);

  const tableOptions: TableOptions = {
    ...options,
    head: processedHeaders,
    columns: updatedColumns,
    typeColors: {
      string: "green",
      number: "yellow",
      boolean: "cyan",
      object: "magenta",
    },
  };

  const result = screen.tableOut(processedTableData, tableOptions);
  console.log(result);

  return table;
}

export class Screen {
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

  public tableOut(data: any[] | Object, options: TableOptions = {}): string {
    try {
      const { tableData, headers } = this.prepareData(data, options);
      const safeColumns = this.prepareSafeColumns(tableData, headers, options);
      const colWidths = this.calculateColumnWidths(
        tableData,
        headers,
        safeColumns
      );
      const styledData = this.applyStyleToData(
        tableData,
        headers,
        safeColumns,
        colWidths,
        options
      );

      // First pass: Generate table without title to get width
      const config = this.prepareTableConfig(false);
      const tempOutput: string = table(styledData, config);
      const tableWidth = tempOutput.split("\n")[0].length;

      // Prepare title if needed
      let titleString = "";
      if (options.title) {
        titleString = this.prepareTitle(options.title, tableWidth);
      }

      // Second pass: Generate full table with correct title
      const fullConfig = this.prepareTableConfig(!!options.title);
      const output: string = table(styledData, fullConfig);

      // Combine title (if any) and table
      return titleString
        ? drawBorder(titleString, { bottom: false }) + "\n" + output
        : output;
    } catch (error) {
      console.error("Error in tableOut method:", error);
      return "Error generating table";
    }
  }

  private prepareData(
    data: any[] | Object,
    options: TableOptions
  ): { tableData: any[][]; headers: string[] } {
    if (Array.isArray(data)) {
      const headers = options.head || Object.keys(data[0]);
      const tableData = data.map((row) =>
        headers.map((header) => (row[header] !== undefined ? row[header] : ""))
      );
      return { tableData, headers };
    }

    if (typeof data === "object" && data !== null) {
      const headers = options.head || ["Key", "Value"];
      const tableData = Object.entries(data);
      return { tableData, headers };
    }

    const headers = options.head || ["Value"];
    const tableData = [[data]];
    return { tableData, headers };
  }

  private prepareSafeColumns(
    tableData: any[][],
    headers: string[],
    options: TableOptions
  ): ColumnOptions[] {
    const safeColumns: ColumnOptions[] = options.columns || [];
    const columnCount: number = Math.max(
      headers.length,
      ...tableData.map((row) => row.length)
    );
    while (safeColumns.length < columnCount) {
      safeColumns.push({});
    }
    return safeColumns;
  }

  private calculateColumnWidths(
    tableData: any[][],
    headers: string[],
    safeColumns: ColumnOptions[]
  ): number[] {
    return safeColumns.map(
      (col: ColumnOptions, index: number): number =>
        col.width || this.calculateColumnWidth([headers, ...tableData], index)
    );
  }

  private calculateColumnWidth(data: any[][], columnIndex: number): number {
    const columnData: any[] = data.map((row: any[]): any => row[columnIndex]);
    const maxWidth: number = Math.max(
      ...columnData.map((cell: any): number =>
        this.getVisibleLength(this.safeToString(cell))
      ),
      0
    );
    return maxWidth; // Add some padding
  }

  private applyStyleToData(
    tableData: any[][],
    headers: string[],
    safeColumns: ColumnOptions[],
    colWidths: number[],
    options: TableOptions
  ): string[][] {
    const styledData: string[][] = tableData.map((row: any[]): string[] =>
      row.map((cell: any, index: number): string =>
        this.styleCell(cell, index, safeColumns, colWidths, options)
      )
    );

    const styledHeaders: string[] = headers.map(
      (header: string, index: number): string =>
        this.styleHeader(header, index, safeColumns, colWidths)
    );

    return [styledHeaders, ...styledData];
  }

  private styleCell(
    cell: any,
    index: number,
    safeColumns: ColumnOptions[],
    colWidths: number[],
    options: TableOptions
  ): string {
    const columnOptions: ColumnOptions = safeColumns[index] || {};
    const justification: Justification = columnOptions.justification || "left";
    const width: number = colWidths[index];

    let color: string | undefined = columnOptions.color;

    if (!color && options.typeColors) {
      color = this.determineColor(cell, options.typeColors);
    }

    const cellString: string = this.safeToString(cell);

    const coloredCell: string = cellString.includes("\x1B")
      ? cellString
      : color
      ? chalk[color](cellString)
      : cellString;

    return this.justifyText(coloredCell, width, justification);
  }

  private styleHeader(
    header: string,
    index: number,
    safeColumns: ColumnOptions[],
    colWidths: number[]
  ): string {
    const columnOptions: ColumnOptions = safeColumns[index] || {};
    const color: string = columnOptions.color || "white";
    const justification: Justification = columnOptions.justification || "left";
    const width: number = colWidths[index];
    return this.justifyText(chalk[color].bold(header), width, justification);
  }

  private determineColor(
    cell: any,
    typeColors: TableOptions["typeColors"]
  ): string | undefined {
    if (typeof cell === "number" && typeColors?.number) {
      return typeColors.number;
    }
    if (typeof cell === "string" && typeColors?.string) {
      return typeColors.string;
    }
    if (typeof cell === "boolean" && typeColors?.boolean) {
      return typeColors.boolean;
    }
    if (typeof cell === "object" && cell !== null && typeColors?.object) {
      return typeColors.object;
    }
    return undefined;
  }

  private prepareTitle(title: Title, width: number): string {
    let { title: titleText, justification = "left" } = title;
    const contentWidth = width - 4; // Accounting for border characters

    if (titleText.length > contentWidth) {
      titleText = titleText.slice(0, contentWidth - 3) + "...";
    }

    switch (justification) {
      case "right":
        titleText = titleText.padStart(contentWidth);
        break;
      case "center":
        const padding = Math.floor((contentWidth - titleText.length) / 2);
        titleText =
          " ".repeat(padding) +
          titleText +
          " ".repeat(contentWidth - titleText.length - padding);
        break;
      case "left":
      default:
        titleText = titleText.padEnd(contentWidth);
    }

    return titleText;
  }

  private prepareTableConfig(hasTitle: boolean): TableUserConfig {
    const borderCharacters = getBorderCharacters("norc");
    const customBorderCharacters = hasTitle
      ? {
          ...borderCharacters,
          topLeft: "├",
          topRight: "┤",
        }
      : borderCharacters;

    return {
      border: customBorderCharacters,
      drawHorizontalLine: (index: number, size: number): boolean =>
        index === 0 || index === 1 || index === size,
    };
  }

  private getVisibleLength(str: string): number {
    return str.replace(/\u001b\[[0-9;]*m/g, "").length;
  }

  private safeToString(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value.toString();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  private justifyText(
    text: string,
    width: number,
    justification: Justification
  ): string {
    const visibleLength: number = this.getVisibleLength(text);
    const paddingLength: number = Math.max(0, width - visibleLength);

    switch (justification) {
      case "right":
        return " ".repeat(paddingLength) + text;
      case "center":
        const leftPad: number = Math.floor(paddingLength / 2);
        const rightPad: number = paddingLength - leftPad;
        return " ".repeat(leftPad) + text + " ".repeat(rightPad);
      case "left":
      default:
        return text + " ".repeat(paddingLength);
    }
  }

  clear(): void {
    console.clear();
  }
}

export const screen = new Screen();
