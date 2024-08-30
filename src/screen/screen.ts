import { table, getBorderCharacters, TableUserConfig } from "table";
import chalk from "chalk";

type Justification = "left" | "center" | "right";

export interface ColumnOptions {
  width?: number;
  color?: string;
  justification?: Justification;
}

interface TableOptions {
  columns?: ColumnOptions[];
  head?: string[];
  typeColors?: {
    number?: string;
    string?: string;
    boolean?: string;
    object?: string;
  };
  topLeftCorner?: string;
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

function tableRowLists_generate(
  tableData: any[],
  selectedFields: string[]
): TableContent | null {
  let headers: string[];
  let body: any[][];

  if (Array.isArray(tableData) && tableData.length > 0) {
    if (tableData.every((item) => typeof item === "string")) {
      // Single-column case
      headers = ["(index)", selectedFields[0] || "Value"];
      body = tableData.map((item, index) => [index, item]);
    } else if (tableData[0].length === 2 && selectedFields.length === 2) {
      // Assume it's already in the correct format
      headers = selectedFields;
      body = tableData;
    } else {
      // Multi-column case
      headers = selectedFields;
      body = tableData.map((row) =>
        headers.map((field) => (row[field] !== undefined ? row[field] : ""))
      );
    }
  } else {
    console.error("Invalid table data");
    return null;
  }

  return { headers, body };
}

function processTableInput(
  tableData: any[] | string[][] | string[],
  headers: string[] | string
): { processedTableData: any[]; processedHeaders: string[] } {
  let processedTableData: any[];
  let processedHeaders: string[];

  if (
    Array.isArray(tableData) &&
    (typeof tableData[0] === "string" || Array.isArray(tableData[0]))
  ) {
    const screen = new Screen();
    processedTableData = screen.tableData_construct(
      tableData as string[][] | string[],
      headers
    );
    processedHeaders = Array.isArray(headers)
      ? headers
      : headers.split(",").map((h) => h.trim());
  } else {
    processedTableData = tableData as any[];
    processedHeaders = Array.isArray(headers)
      ? headers
      : headers.split(",").map((h) => h.trim());
  }

  return { processedTableData, processedHeaders };
}

export function displayTable(
  tableData: any[] | string[][] | string[],
  headers: string[] | string,
  topLeftCorner?: string
): TableContent | null {
  const { processedTableData, processedHeaders } = processTableInput(
    tableData,
    headers
  );

  const table: TableContent | null = tableRowLists_generate(
    processedTableData,
    processedHeaders
  );

  if (!table) {
    return null;
  }

  const columns: ColumnOptions[] = table.headers.map(() => ({
    justification: "left" as const,
  }));
  columns[0].justification = "right";
  columns[0].color = "white";

  const screen = new Screen();
  const tableOptions: TableOptions = {
    head: processedHeaders,
    columns: columns,
    typeColors: {
      string: "green",
      number: "yellow",
      boolean: "cyan",
      object: "magenta",
    },
  };

  // Only add topLeftCorner to options if it's provided
  if (topLeftCorner !== undefined) {
    tableOptions.topLeftCorner = topLeftCorner;
  }

  screen.table(processedTableData, tableOptions);

  return table;
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

  public withBorder(text: string, borders: Borders = {}): void {
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
        (actualBorders.top === true && index === 0) ||
        (actualBorders.bottom === true && index === size),
      drawVerticalLine: (index: number, size: number): boolean =>
        (actualBorders.left === true && index === 0) ||
        (actualBorders.right === true && index === size),
    };
    const output = table(data, config).trim();
    this.log(output);
  }

  public tableData_construct(
    body: string[][] | string[],
    headers: string[] | string
  ): any[] {
    // Normalize headers to string[]
    const normalizedHeaders: string[] = Array.isArray(headers)
      ? headers
      : headers.split(",").map((h) => h.trim());

    // Normalize body to string[][]
    const normalizedBody: string[][] = Array.isArray(body[0])
      ? (body as string[][])
      : (body as string[]).map((row) =>
          row.split(",").map((cell) => cell.trim())
        );

    // Construct tableData
    const tableData: any[] = normalizedBody.map((row: string[]) =>
      normalizedHeaders.reduce(
        (rowObject: any, header: string, index: number) => {
          rowObject[header] = row[index] || "";
          return rowObject;
        },
        {}
      )
    );

    return tableData;
  }

  public table(data: any[] | Object, options: TableOptions = {}): void {
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
      const config = this.prepareTableConfig(colWidths, options.topLeftCorner);
      const output: string = table(styledData, config);
      console.log(output);
    } catch (error) {
      console.error("Error in table method:", error);
    }
  }

  private prepareData(
    data: any[] | Object,
    options: TableOptions
  ): { tableData: any[][]; headers: string[] } {
    if (Array.isArray(data)) {
      const tableContent = tableRowLists_generate(data, options.head || []);
      if (tableContent) {
        return { tableData: tableContent.body, headers: tableContent.headers };
      }
    }

    // Handle object case
    if (typeof data === "object" && data !== null) {
      const headers = options.head || ["Key", "Value"];
      const tableData = Object.entries(data);
      return { tableData, headers };
    }

    // Handle primitive value
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

    // Prioritize column-specific color
    let color: string | undefined = columnOptions.color;

    // If no column-specific color, then use typeColors
    if (!color && options.typeColors) {
      color = this.determineColor(cell, options.typeColors);
    }

    const cellString: string = this.safeToString(cell);

    // Apply color if it's set and the cell doesn't already have chalk styling
    const coloredCell: string = cellString.includes("\x1B")
      ? cellString
      : color
      ? chalk[color](cellString)
      : cellString;

    return this.justifyText(coloredCell, width, justification);
  }
  private applyTypeColor(
    cell: any,
    typeColors: TableOptions["typeColors"]
  ): string {
    const cellType = typeof cell;
    const color = typeColors?.[cellType as keyof typeof typeColors];
    return color
      ? chalk[color](this.safeToString(cell))
      : this.safeToString(cell);
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

  private prepareTableConfig(
    colWidths: number[],
    topLeftCorner?: string
  ): TableUserConfig {
    const borderCharacters = getBorderCharacters("norc");
    const customBorderCharacters = topLeftCorner
      ? {
          ...borderCharacters,
          topLeft: topLeftCorner,
        }
      : borderCharacters;

    return {
      border: customBorderCharacters,
      columns: colWidths.map((width: number) => ({ width })),
      drawHorizontalLine: (index: number, size: number): boolean =>
        index === 0 || index === 1 || index === size,
    };
  }

  private calculateColumnWidth(data: any[][], columnIndex: number): number {
    const columnData: any[] = data.map((row: any[]): any => row[columnIndex]);
    const maxWidth: number = Math.max(
      ...columnData.map((cell: any): number =>
        this.getVisibleLength(this.safeToString(cell))
      ),
      0
    );
    return maxWidth + 2; // Add some padding
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
