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
  borderless?: boolean;
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
  body: unknown[][];
}

/**
 * Processes raw table input data and headers into a standardized format.
 *
 * @param tableData - The raw table data, can be `any[] | string[][] | string[]`.
 * @param headers - The headers for the table, can be `string[] | string`.
 * @returns An object containing the processed table data and headers.
 */
function tableInput_process(
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
      }, {} as Record<string, any>);
    });
  } else if (Array.isArray(tableData) && typeof tableData[0] === "string") {
    // tableData is a string[]
    processedTableData = tableData.map((rowStr) => {
      const rowValues = rowStr.split(",");
      return processedHeaders.reduce((rowObj, header, index) => {
        rowObj[header] = rowValues[index];
        return rowObj;
      }, {} as Record<string, any>);
    });
  } else {
    // tableData is neither string[][] nor string[]
    processedTableData = tableData as any[];
  }
  return { processedTableData, processedHeaders };
}

/**
 * Packs table data and selected fields into a `TableContent` object.
 *
 * @param tableData - The table data.
 * @param selectedFields - The fields to include as headers.
 * @returns A `TableContent` object or null if invalid data.
 */
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

/**
 * Draws a border around the given text.
 *
 * @param text - The text to wrap with a border.
 * @param borders - Optional configuration for which borders to draw.
 * @returns The text surrounded by a border.
 */
export function border_draw(text: string, borders: Borders = {}): string {
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

/**
 * Applies default settings to the first column of a table.
 *
 * @param columns - An array of ColumnOptions.
 * @returns The updated array of ColumnOptions.
 */
function firstColumnSettings_apply(columns: ColumnOptions[]): ColumnOptions[] {
  if (columns.length > 1) {
    return [
      { ...columns[0], justification: "right", color: "white" },
      ...columns.slice(1),
    ];
  }
  return columns;
}

/**
 * Displays a formatted table in the console.
 *
 * @param tableData - The data for the table.
 * @param headers - The headers for the table.
 * @param options - Optional table display options.
 * @returns The `TableContent` object or null on error.
 */
export function table_display(
  tableData: any[] | string[][] | string[],
  headers: string[] | string,
  options: TableOptions = {}
): TableContent | null {
  const { processedTableData, processedHeaders } = tableInput_process(
    tableData,
    headers
  );

  const tableObj: TableContent | null = tableContent_pack(
    processedTableData,
    processedHeaders
  );

  if (!tableObj) {
    return null;
  }

  const columns: ColumnOptions[] = tableObj.headers.map(() => ({
    justification: "left" as const,
  }));
  const updatedColumns = firstColumnSettings_apply(columns);

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

  const result = screen.table_output(processedTableData, tableOptions);
  console.log(result);

  return tableObj;
}

/**
 * Provides screen utilities for logging and table output.
 */
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

  /**
   * Generates a formatted table output string.
   *
   * @param data - The data to display in the table.
   * @param options - Options for table formatting, including headers, columns, and title.
   * @returns A string representation of the formatted table.
   */
  public table_output(data: any[] | Object, options: TableOptions = {}): string {
    try {
      const { tableData, headers } = this.data_prepare(data, options);
      const safeColumns = this.safeColumns_prepare(tableData, headers, options);
      const colWidths = this.columnWidths_calculate(
        tableData,
        headers,
        safeColumns
      );
      const styledData = this.data_applyStyle(
        tableData,
        headers,
        safeColumns,
        colWidths,
        options
      );

      // First pass: Generate table without title to get width
      const config = this.tableConfig_prepare(false, options);
      const tempOutput: string = table(styledData, config);
      const tableWidth = tempOutput.split("\n")[0].length;

      // Prepare title if needed
      let titleString = "";
      if (options.title) {
        titleString = this.title_prepare(options.title, tableWidth);
      }

      // Second pass: Generate full table with correct title
      const fullConfig = this.tableConfig_prepare(!!options.title, options);
      const output: string = table(styledData, fullConfig);

      // Combine title (if any) and table
      return titleString
        ? border_draw(titleString, { bottom: false }) + "\n" + output
        : output;
    } catch (error) {
      console.error("Error in table_output method:", error);
      return "Error generating table";
    }
  }

  /**
   * Prepares raw data for table display.
   *
   * @param data - The input data, which can be an array or an object.
   * @param options - Table options, specifically for `head`.
   * @returns An object containing `tableData` (2D array) and `headers`.
   */
  private data_prepare(
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

  /**
   * Ensures that the `columns` option has enough entries for all table columns.
   *
   * @param tableData - The 2D array of table data.
   * @param headers - The array of table headers.
   * @param options - Table options.
   * @returns An array of `ColumnOptions` with enough entries for all columns.
   */
  private safeColumns_prepare(
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

  /**
   * Calculates the width for each column.
   *
   * @param tableData - The 2D array of table data.
   * @param headers - The array of table headers.
   * @param safeColumns - The array of `ColumnOptions` for each column.
   * @returns An array of numbers representing the calculated width for each column.
   */
  private columnWidths_calculate(
    tableData: any[][],
    headers: string[],
    safeColumns: ColumnOptions[]
  ): number[] {
    return safeColumns.map(
      (col: ColumnOptions, index: number): number =>
        col.width || this.columnWidth_calculate([headers, ...tableData], index)
    );
  }

  /**
   * Calculates the maximum visible width for a specific column.
   *
   * @param data - The 2D array of data (including headers).
   * @param columnIndex - The index of the column to calculate width for.
   * @returns The maximum visible length in the column.
   */
  private columnWidth_calculate(data: any[][], columnIndex: number): number {
    const columnData: any[] = data.map((row: any[]): any => row[columnIndex]);
    const maxWidth: number = Math.max(
      ...columnData.map((cell: any): number =>
        this.visibleLength_get(this.string_safeConvert(cell))
      ),
      0
    );
    return maxWidth; // Add some padding
  }

  /**
   * Applies styling (color, justification) to the table data.
   *
   * @param tableData - The 2D array of raw table data.
   * @param headers - The array of table headers.
   * @param safeColumns - The array of `ColumnOptions`.
   * @param colWidths - The calculated widths for each column.
   * @param options - Table options for type colors.
   * @returns A 2D array of styled strings.
   */
  private data_applyStyle(
    tableData: any[][],
    headers: string[],
    safeColumns: ColumnOptions[],
    colWidths: number[],
    options: TableOptions
  ): string[][] {
    const styledData: string[][] = tableData.map((row: any[]): string[] =>
      row.map((cell: any, index: number): string =>
        this.cell_style(cell, index, safeColumns, colWidths, options)
      )
    );

    const styledHeaders: string[] = headers.map(
      (header: string, index: number): string =>
        this.header_style(header, index, safeColumns, colWidths)
    );

    return [styledHeaders, ...styledData];
  }

  /**
   * Styles an individual table cell based on its content type and column options.
   *
   * @param cell - The cell content.
   * @param index - The column index of the cell.
   * @param safeColumns - The array of `ColumnOptions`.
   * @param colWidths - The calculated width for the column.
   * @param options - Table options for type colors.
   * @returns The styled and justified cell string.
   */
  private cell_style(
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
      color = this.color_determine(cell, options.typeColors);
    }

    const cellString: string = this.string_safeConvert(cell);

    const coloredCell: string = cellString.includes("\u001b")
      ? cellString
      : color
      ? (chalk as any)[color](cellString)
      : cellString;

    return this.text_justify(coloredCell, width, justification);
  }

  /**
   * Styles a table header cell.
   *
   * @param header - The header string.
   * @param index - The column index of the header.
   * @param safeColumns - The array of `ColumnOptions`.
   * @param colWidths - The calculated width for the column.
   * @returns The styled and justified header string.
   */
  private header_style(
    header: string,
    index: number,
    safeColumns: ColumnOptions[],
    colWidths: number[]
  ): string {
    const columnOptions: ColumnOptions = safeColumns[index] || {};
    const color: string = columnOptions.color || "white";
    const justification: Justification = columnOptions.justification || "left";
    const width: number = colWidths[index];
    return this.text_justify((chalk as any)[color].bold(header), width, justification);
  }

  /**
   * Determines the color for a cell based on its type.
   *
   * @param cell - The cell content.
   * @param typeColors - Map of type to color strings.
   * @returns The color string or undefined if no specific color for the type.
   */
  private color_determine(
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

  /**
   * Prepares the title string for the table, including justification and truncation.
   *
   * @param title - The Title object.
   * @param width - The total width of the table.
   * @returns The formatted title string.
   */
  private title_prepare(title: Title, width: number): string {
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

  /**
   * Prepares the `table` library configuration object.
   *
   * @param hasTitle - Whether the table has a title (affects border drawing).
   * @param options - Table options to check for borderless mode.
   * @returns The `TableUserConfig` object.
   */
  private tableConfig_prepare(hasTitle: boolean, options: TableOptions): TableUserConfig {
    if (options.borderless) {
      return {
        border: getBorderCharacters("void"),
        drawHorizontalLine: () => false,
      };
    }

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

  /**
   * Calculates the visible length of a string, accounting for ANSI escape codes.
   *
   * @param str - The string to measure.
   * @returns The visible length of the string.
   */
  private visibleLength_get(str: string): number {
    return str.replace(/\u001b\[[0-9;]*m/g, "").length;
  }

  /**
   * Safely converts any value to a string.
   *
   * @param value - The value to convert.
   * @returns The string representation of the value.
   */
  private string_safeConvert(value: any): string {
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

  /**
   * Justifies text within a given width.
   *
   * @param text - The text to justify.
   * @param width - The total width for justification.
   * @param justification - The justification type ('left', 'center', 'right').
   * @returns The justified text string.
   */
  private text_justify(
    text: string,
    width: number,
    justification: Justification
  ): string {
    const visibleLength: number = this.visibleLength_get(text);
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