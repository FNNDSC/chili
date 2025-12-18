import { Command } from "commander";
import {
  Result,
  errorStack_getAllOfType,
  PACSRetrieveRecord,
  PACSQueryStatusReport,
  StudyRetrieveStatus,
  SeriesRetrieveStatus,
} from "@fnndsc/cumin";
import {
  pacsRetrieve_create,
  pacsRetrieve_delete,
  pacsRetrieve_statusForQuery,
} from "@fnndsc/salsa";
import { border_draw } from "../screen/screen.js";

/**
 * Handler for PACS retrieve commands.
 */
export class PACSRetrieveGroupHandler {
  private assetName: string = "pacsretrieve";

  /**
   * Setup PACS retrieve commands on the parent command.
   *
   * @param program - Commander program instance.
   */
  pacsRetrieveCommand_setup(program: Command): void {
    const pacsRetrieveCommand = program
      .command(this.assetName)
      .description("Manage PACS retrieves (pull DICOM data from PACS to ChRIS)");

    // pull command
    pacsRetrieveCommand
      .command("pull <queryId>")
      .description("Trigger a PACS retrieve to pull DICOM data for a query")
      .action(async (queryIdStr: string) => {
        await this.retrieve_pull(queryIdStr);
      });

    // report command
    pacsRetrieveCommand
      .command("report <queryId>")
      .description("Show detailed status report for a query retrieve")
      .action(async (queryIdStr: string) => {
        await this.retrieve_report(queryIdStr);
      });

    // cancel command
    pacsRetrieveCommand
      .command("cancel <retrieveId>")
      .description("Cancel (delete) a PACS retrieve")
      .action(async (retrieveIdStr: string) => {
        await this.retrieve_cancel(retrieveIdStr);
      });
  }

  /**
   * Handle the 'pull' command - create a new retrieve.
   *
   * @param queryIdStr - Query ID as string.
   */
  private async retrieve_pull(queryIdStr: string): Promise<void> {
    const queryId: number = Number(queryIdStr);
    if (Number.isNaN(queryId)) {
      console.log(border_draw("Query ID must be a number."));
      return;
    }

    const result: Result<PACSRetrieveRecord> = await pacsRetrieve_create(queryId);

    if (!result.ok) {
      const errors = errorStack_getAllOfType("error");
      if (errors.length) {
        errors.forEach((msg: string) => console.log(border_draw(msg)));
      } else {
        console.log(border_draw(`Failed to create PACS retrieve for query ${queryId}.`));
      }
      return;
    }

    const record: PACSRetrieveRecord = result.value;
    const msg: string = [
      "Created PACS retrieve",
      `id=${record.id}`,
      `query=${queryId}`,
      `status=${record.status || "created"}`,
    ].join(" ");
    console.log(border_draw(msg));
  }

  /**
   * Handle the 'report' command - show detailed status.
   *
   * @param queryIdStr - Query ID as string.
   */
  private async retrieve_report(queryIdStr: string): Promise<void> {
    const queryId: number = Number(queryIdStr);
    if (Number.isNaN(queryId)) {
      console.log(border_draw("Query ID must be a number."));
      return;
    }

    const result: Result<PACSQueryStatusReport> = await pacsRetrieve_statusForQuery(queryId);

    if (!result.ok) {
      const errors = errorStack_getAllOfType("error");
      if (errors.length) {
        errors.forEach((msg: string) => console.log(border_draw(msg)));
      } else {
        console.log(border_draw(`Failed to generate status report for query ${queryId}.`));
      }
      return;
    }

    const report: PACSQueryStatusReport = result.value;
    const rendered: string = this.report_render(report);
    console.log(border_draw(rendered));
  }

  /**
   * Handle the 'cancel' command - delete a retrieve.
   *
   * @param retrieveIdStr - Retrieve ID as string.
   */
  private async retrieve_cancel(retrieveIdStr: string): Promise<void> {
    const retrieveId: number = Number(retrieveIdStr);
    if (Number.isNaN(retrieveId)) {
      console.log(border_draw("Retrieve ID must be a number."));
      return;
    }

    const result: Result<void> = await pacsRetrieve_delete(retrieveId);

    if (!result.ok) {
      const errors = errorStack_getAllOfType("error");
      if (errors.length) {
        errors.forEach((msg: string) => console.log(border_draw(msg)));
      } else {
        console.log(border_draw(`Failed to cancel PACS retrieve ${retrieveId}.`));
      }
      return;
    }

    console.log(border_draw(`PACS retrieve ${retrieveId} cancelled.`));
  }

  /**
   * Determine overall completion status from series statuses.
   *
   * @param report - The status report.
   * @returns True if all series are pulled.
   */
  private allSeries_arePulled(report: PACSQueryStatusReport): boolean {
    if (report.studies.length === 0) {
      return false;
    }

    for (const study of report.studies) {
      for (const series of study.series) {
        if (series.status !== "pulled") {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Render a status report into a human-readable string.
   *
   * @param report - The status report.
   * @returns Formatted string.
   */
  private report_render(report: PACSQueryStatusReport): string {
    const lines: string[] = [];

    lines.push(`Query ID: ${report.queryId}`);

    if (report.retrieveId !== undefined) {
      lines.push(`Retrieve ID: ${report.retrieveId}`);

      // Check if all series are actually pulled (more accurate than retrieve record status)
      const allPulled = this.allSeries_arePulled(report);
      const displayStatus = allPulled
        ? "Completed"
        : this.status_mapToDisplay(report.retrieveStatus || "unknown");

      lines.push(`Retrieve Status: ${displayStatus}`);
    } else {
      lines.push("Retrieve Status: No retrieve created yet");
    }

    lines.push("");

    if (report.studies.length === 0) {
      lines.push("No studies found in query result.");
      return lines.join("\n");
    }

    report.studies.forEach((study: StudyRetrieveStatus, idx: number) => {
      this.study_renderTo(study, idx + 1, lines);
    });

    return lines.join("\n");
  }

  /**
   * Extract value from a DICOM tag object or return as-is.
   *
   * @param val - Potentially a tag object with {label, value} or a primitive.
   * @returns The extracted value.
   */
  private tagValue_extract(val: unknown): string {
    if (val && typeof val === "object" && "value" in (val as Record<string, unknown>)) {
      const tagObj = val as { value?: unknown };
      return String(tagObj.value ?? "");
    }
    return String(val ?? "");
  }

  /**
   * Render a single study to the lines array.
   *
   * @param study - Study status.
   * @param studyNum - Study number (1-indexed).
   * @param lines - Output lines array.
   */
  private study_renderTo(
    study: StudyRetrieveStatus,
    studyNum: number,
    lines: string[]
  ): void {
    lines.push(`Study ${studyNum}`);

    const studyDesc = this.tagValue_extract(study.studyDescription);
    const studyUID = this.tagValue_extract(study.studyInstanceUID);

    if (studyDesc) {
      lines.push(`  Description: ${studyDesc}`);
    }
    if (studyUID) {
      lines.push(`  UID: ${studyUID}`);
    }

    if (study.series.length === 0) {
      lines.push("  No series found.");
      lines.push("");
      return;
    }

    study.series.forEach((series: SeriesRetrieveStatus, idx: number) => {
      this.series_renderTo(series, idx + 1, lines);
    });

    lines.push("");
  }

  /**
   * Render a single series to the lines array.
   *
   * @param series - Series status.
   * @param seriesNum - Series number (1-indexed).
   * @param lines - Output lines array.
   */
  private series_renderTo(
    series: SeriesRetrieveStatus,
    seriesNum: number,
    lines: string[]
  ): void {
    const seriesDesc = this.tagValue_extract(series.seriesDescription);
    const description: string = seriesDesc || `Series ${seriesNum}`;
    const statusDisplay: string = this.series_statusDisplay(series);

    lines.push(`  ${description}: ${statusDisplay}`);
  }

  /**
   * Generate display string for series status.
   *
   * @param series - Series status.
   * @returns Display string.
   */
  private series_statusDisplay(series: SeriesRetrieveStatus): string {
    const { status, actualFiles, expectedFiles } = series;

    switch (status) {
      case "pending":
        return `Pending (0/${expectedFiles} images)`;
      case "pulling":
        return `Pulling (${actualFiles}/${expectedFiles} images)`;
      case "pulled":
        return `Pulled (${actualFiles} images)`;
      case "error":
        return `Error (${actualFiles}/${expectedFiles} images - count mismatch)`;
      default:
        return `Unknown (${actualFiles}/${expectedFiles} images)`;
    }
  }

  /**
   * Map retrieve status to display string.
   *
   * @param status - Raw status string.
   * @returns Display-friendly status.
   */
  private status_mapToDisplay(status: string): string {
    switch (status) {
      case "created":
        return "Pending";
      case "sent":
        return "Retrieving";
      case "succeeded":
        return "Completed";
      case "errored":
        return "Failed";
      default:
        return status;
    }
  }
}
