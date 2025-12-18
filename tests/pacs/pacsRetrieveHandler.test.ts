import { PACSRetrieveGroupHandler } from "../../src/pacs/pacsRetrieveHandler.js";
import { PACSQueryStatusReport, StudyRetrieveStatus } from "@fnndsc/cumin";

describe("PACSRetrieveGroupHandler", () => {
  let handler: PACSRetrieveGroupHandler;

  beforeEach(() => {
    handler = new PACSRetrieveGroupHandler();
  });

  it("renders status report with series progress", () => {
    const report: PACSQueryStatusReport = {
      queryId: 123,
      retrieveId: 456,
      retrieveStatus: "sent",
      studies: [
        {
          studyInfo: {},
          studyInstanceUID: "1.2.3.4",
          studyDescription: "Test Study",
          series: [
            {
              seriesInfo: {},
              seriesInstanceUID: "1.2.3.4.5",
              seriesDescription: "MPRAGE",
              expectedFiles: 220,
              actualFiles: 186,
              status: "pulling",
            },
            {
              seriesInfo: {},
              seriesInstanceUID: "1.2.3.4.6",
              seriesDescription: "DTI",
              expectedFiles: 300,
              actualFiles: 0,
              status: "pending",
            },
          ],
        },
      ],
    };

    const rendered: string = (handler as any).report_render(report);

    expect(rendered).toContain("Query ID: 123");
    expect(rendered).toContain("Retrieve ID: 456");
    expect(rendered).toContain("Study 1");
    expect(rendered).toContain("Test Study");
    expect(rendered).toContain("MPRAGE: Pulling (186/220 images)");
    expect(rendered).toContain("DTI: Pending (0/300 images)");
  });

  it("shows Completed when all series are pulled", () => {
    const report: PACSQueryStatusReport = {
      queryId: 123,
      retrieveId: 456,
      retrieveStatus: "sent", // Backend hasn't updated yet
      studies: [
        {
          studyInfo: {},
          studyInstanceUID: "1.2.3.4",
          series: [
            {
              seriesInfo: {},
              seriesInstanceUID: "1.2.3.4.5",
              seriesDescription: "MPRAGE",
              expectedFiles: 220,
              actualFiles: 220,
              status: "pulled",
            },
          ],
        },
      ],
    };

    const rendered: string = (handler as any).report_render(report);

    expect(rendered).toContain("Retrieve Status: Completed");
  });

  it("extracts tag values correctly", () => {
    const tagValue = { label: "StudyDescription", value: "Test Study" };
    const extracted: string = (handler as any).tagValue_extract(tagValue);
    expect(extracted).toBe("Test Study");
  });

  it("handles primitive values as-is", () => {
    const extracted: string = (handler as any).tagValue_extract("Simple String");
    expect(extracted).toBe("Simple String");
  });

  it("determines series status correctly", () => {
    const pullingStatus = (handler as any).series_statusDisplay({
      status: "pulling",
      actualFiles: 100,
      expectedFiles: 200,
    });
    expect(pullingStatus).toContain("Pulling (100/200 images)");

    const pendingStatus = (handler as any).series_statusDisplay({
      status: "pending",
      actualFiles: 0,
      expectedFiles: 200,
    });
    expect(pendingStatus).toContain("Pending (0/200 images)");

    const pulledStatus = (handler as any).series_statusDisplay({
      status: "pulled",
      actualFiles: 200,
      expectedFiles: 200,
    });
    expect(pulledStatus).toContain("Pulled (200 images)");
  });
});
