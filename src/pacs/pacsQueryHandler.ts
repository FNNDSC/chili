import { Command } from "commander";
import {
  ChRISPACSQueryGroup,
  PACSQueryListOptions,
  PACSQueryCreateData,
  Result,
  FilteredResourceData,
  errorStack_getAllOfType,
  chrisContext,
  Context,
  PACSQueryRecord,
  PACSQueryDecodedResult,
} from "@fnndsc/cumin";
import { pacsQueries_list, pacsQueries_create, pacsQuery_resultDecode } from "@fnndsc/salsa";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { border_draw } from "../screen/screen.js";

/**
 * Handler for PACS queries commands.
 */
export class PACSQueryGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private assetName: string = "pacsqueries";

  constructor() {
    const chrisObject: ChRISPACSQueryGroup = new ChRISPACSQueryGroup();
    this.baseGroupHandler = new BaseGroupHandler(this.assetName, chrisObject);
  }

  /**
   * Render a decoded PACS query JSON payload into a readable string.
   * Expected structure:
   * [
   *   { <study fields>, series: [ { <series fields> }, ... ] },
   *   ...
   * ]
   * Falls back gracefully if structure varies.
   */
  private pacsResult_renderPretty(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const lines: string[] = [];

    const asTag = (val: unknown): { label: string; value: unknown } | null => {
      if (val && typeof val === "object" && "value" in (val as Record<string, unknown>)) {
        const tagObj = val as { label?: unknown; value?: unknown };
        const label: string =
          typeof tagObj.label === "string" && tagObj.label.length
            ? tagObj.label
            : "";
        return { label, value: tagObj.value };
      }
      return null;
    };

    const extractFields = (
      obj: Record<string, unknown>,
      preferredOrder: string[],
      includeAll: boolean
    ): Array<{ label: string; value: unknown }> => {
      const collected: Array<{ label: string; value: unknown }> = [];
      const seen = new Set<string>();

      const pushField = (label: string, value: unknown) => {
        if (label && !seen.has(label)) {
          collected.push({ label, value });
          seen.add(label);
        }
      };

      const scan = (keys: Iterable<string>) => {
        for (const key of keys) {
          const val = obj[key];
          if (Array.isArray(val)) continue;
          const tagVal = asTag(val);
          if (tagVal) {
            const lbl: string = tagVal.label || key;
            pushField(lbl, tagVal.value);
          } else if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
            pushField(key, val);
          }
        }
      };

      scan(preferredOrder);
      if (includeAll) {
        scan(Object.keys(obj));
      }
      return collected;
    };

    const renderStudy = (studyIdx: number, studyObj: Record<string, unknown>): void => {
      const seriesArr: unknown[] | null =
        Array.isArray((studyObj as any).series) ? ((studyObj as any).series as unknown[]) :
        Array.isArray((studyObj as any).Series) ? ((studyObj as any).Series as unknown[]) :
        Array.isArray((studyObj as any).results) ? ((studyObj as any).results as unknown[]) :
        Array.isArray((studyObj as any).data) ? ((studyObj as any).data as unknown[]) :
        null;

      const studyFields = extractFields(studyObj, [
        "AccessionNumber",
        "PatientName",
        "PatientID",
        "PatientBirthDate",
        "PatientSex",
        "StudyDate",
        "StudyDescription",
        "StudyInstanceUID",
        "ModalitiesInStudy",
        "NumberOfStudyRelatedSeries",
        "NumberOfStudyRelatedInstances",
        "RetrieveAETitle",
        "status",
        "QueryRetrieveLevel",
      ], true);

      lines.push(`Study ${studyIdx + 1}`);
      studyFields.forEach((f) => lines.push(`  ${f.label}: ${f.value as string}`));

      if (seriesArr && seriesArr.length) {
        seriesArr.forEach((series, idx) => {
          if (!series || typeof series !== "object") return;
          const seriesFields = extractFields(series as Record<string, unknown>, [
            "SeriesDescription",
            "Modality",
            "SeriesInstanceUID",
            "NumberOfSeriesRelatedInstances",
            "InstanceNumber",
            "PerformedStationAETitle",
            "RetrieveLevel",
            "status",
            "uid",
          ], false);
          lines.push(`  Series ${idx + 1}`);
          seriesFields.forEach((f) =>
            lines.push(`    ${f.label}: ${f.value as string}`)
          );
        });
      }
      lines.push("");
    };

    const payloadArray: unknown[] = Array.isArray(payload) ? (payload as unknown[]) : [payload];
    payloadArray.forEach((item: unknown, idx: number) => {
      if (item && typeof item === "object") {
        renderStudy(idx, item as Record<string, unknown>);
      }
    });

    const output: string = lines.join("\n").trim();
    return output.length ? output : null;
  }

  private async pacsserverContext_resolve(
    overridePacsserver?: string
  ): Promise<string | null> {
    if (overridePacsserver && overridePacsserver.length > 0) {
      return overridePacsserver;
    }
    const current = await chrisContext.current_get(Context.PACSserver);
    return current;
  }

  private options_withPACSFilter(
    options: CLIoptions,
    pacsserver: string | null
  ): CLIoptions {
    if (!pacsserver) {
      return options;
    }
    const pacsFilter: string = /^\d+$/.test(pacsserver)
      ? `pacs_id:${pacsserver}`
      : `pacs_identifier:${pacsserver}`;
    const searchParts: string[] = [];
    if (options.search) {
      searchParts.push(options.search);
    }
    searchParts.push(pacsFilter);
    return { ...options, search: searchParts.join(",") };
  }

  pacsQueryCommand_setup(program: Command): void {
    const pacsQueryCommand = program
      .command(this.assetName)
      .description("Interact with PACS queries");

    const listCommand = this.baseGroupHandler.baseListCommand_create(
      async (options: CLIoptions & { pacsserver?: string }) => {
        const pacsserver: string | null = await this.pacsserverContext_resolve(
          options.pacsserver
        );
        if (!pacsserver) {
          console.log(
            border_draw("No PACS server in context. Use --pacsserver or set via context.")
          );
          return;
        }
        const mergedOptions: CLIoptions = this.options_withPACSFilter(
          options,
          pacsserver
        );
        await this.baseGroupHandler.resources_list(mergedOptions);
      }
    );
    listCommand.option(
      "--pacsserver <pacsserver>",
      "PACS server ID or identifier to filter queries"
    );
    pacsQueryCommand.addCommand(listCommand);

    pacsQueryCommand
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.baseGroupHandler.resourceFields_list();
      });

    pacsQueryCommand
      .command("create <query>")
      .description(
        "Create a PACS query against the current or specified PACS server. <query> can be JSON or comma-separated key:value pairs."
      )
      .option("--title <title>", "Title for the PACS query", `Query ${Date.now()}`)
      .option(
        "--description <description>",
        "Optional description for the PACS query"
      )
      .option(
        "--pacsserver <pacsserver>",
        "PACS server ID or identifier (overrides context)"
      )
      .action(async (queryInput: string, options: CLIoptions & { title?: string; description?: string; pacsserver?: string }) => {
        const pacsserver: string | null = await this.pacsserverContext_resolve(
          options.pacsserver
        );
        if (!pacsserver) {
          border_draw("No PACS server in context. Use --pacsserver or set via context.");
          return;
        }

        const payload: PACSQueryCreateData | null = this.queryPayload_build(
          queryInput,
          options.title,
          options.description
        );
        if (!payload) {
          console.log(
            border_draw("Invalid query format. Provide JSON or comma-separated key:value pairs.")
          );
          return;
        }

        const result: Result<PACSQueryRecord> = await pacsQueries_create(pacsserver, payload);
        if (!result.ok) {
          const errors = errorStack_getAllOfType("error");
          if (errors.length) {
            errors.forEach((msg: string) => console.log(border_draw(msg)));
          } else {
            console.log(border_draw("Failed to create PACS query."));
          }
          return;
        }
        const created: PACSQueryRecord = result.value;
        const msg: string = [
          "Created PACS query",
          `id=${created.id}`,
          `status=${created.status || "unknown"}`,
          `pacs=${pacsserver}`,
          `title="${created.title ?? options.title ?? ""}"`,
        ].join(" ");
        console.log(border_draw(msg.trim()));
      });

    pacsQueryCommand
      .command("decode <queryId>")
      .description("Decode the result payload of a PACS query")
      .option("--raw", "Print raw decoded JSON if available")
      .action(async (queryId: string, options: { raw?: boolean }) => {
        const idNum: number = Number(queryId);
        if (Number.isNaN(idNum)) {
          console.log(border_draw("queryId must be a number."));
          return;
        }
        const result: Result<PACSQueryDecodedResult> = await pacsQuery_resultDecode(idNum);
        if (!result.ok) {
          const errors = errorStack_getAllOfType("error");
          if (errors.length) {
            errors.forEach((msg: string) => console.log(border_draw(msg)));
          } else {
            console.log(border_draw(`Failed to decode PACS query result for ${idNum}.`));
          }
          return;
        }
        const decoded: PACSQueryDecodedResult = result.value;
        // Prefer JSON, then text, else indicate base64 length
        if (decoded.json !== undefined) {
          if (options.raw) {
            console.log(border_draw(JSON.stringify(decoded.json, null, 2)));
            return;
          }
          const pretty: string | null = this.pacsResult_renderPretty(decoded.json);
          if (pretty) {
            console.log(border_draw(pretty));
          } else {
            console.log(border_draw(JSON.stringify(decoded.json, null, 2)));
          }
        } else if (decoded.text) {
          console.log(border_draw(decoded.text));
        } else {
          const len = decoded.raw.length;
          console.log(
            border_draw(`Decoded payload available (base64 length ${len}), but not printable.`)
          );
        }
      });
  }

  /**
   * Build a PACS query payload from JSON or comma-separated key:value pairs.
   */
  private queryPayload_build(
    queryInput: string,
    title?: string,
    description?: string
  ): PACSQueryCreateData | null {
    let queryObject: Record<string, string> = {};
    try {
      const parsed = JSON.parse(queryInput);
      if (typeof parsed === "object" && parsed !== null) {
        queryObject = parsed as Record<string, string>;
      }
    } catch {
      // Fallback to comma-separated key:value pairs
      queryObject = queryInput.split(",").reduce<Record<string, string>>((acc, part) => {
        const [keyRaw, ...rest] = part.split(":");
        if (!keyRaw || rest.length === 0) {
          return acc;
        }
        const key = keyRaw.trim();
        const value = rest.join(":").trim();
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }

    if (Object.keys(queryObject).length === 0) {
      return null;
    }

    const payload: PACSQueryCreateData = {
      title: title || `Query ${Date.now()}`,
      query: JSON.stringify(queryObject),
    };
    if (description) {
      payload.description = description;
    }
    return payload;
  }
}
