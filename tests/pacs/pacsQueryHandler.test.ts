import { PACSQueryGroupHandler } from "../../src/pacs/pacsQueryHandler.js";

describe("PACSQueryGroupHandler rendering", () => {
  it("renders studies with nested series from decoded JSON", () => {
    const handler = new PACSQueryGroupHandler();
    const payload = [
      {
        AccessionNumber: { value: "ACC1" },
        PatientID: { value: "PID1" },
        StudyInstanceUID: { value: "STUDY1" },
        series: [
          {
            SeriesDescription: { value: "Series A" },
            Modality: { value: "DX" },
            SeriesInstanceUID: { value: "SERIES1" },
          },
          {
            SeriesDescription: { value: "Series B" },
            Modality: { value: "SR" },
            SeriesInstanceUID: { value: "SERIES2" },
          },
        ],
      },
    ];

    // Access the private method for rendering
    const pretty: string | null = (handler as any).pacsResult_renderPretty(payload);
    expect(pretty).toContain("Study 1");
    expect(pretty).toContain("Series 1");
    expect(pretty).toContain("Series 2");
    expect(pretty).toContain("SeriesInstanceUID: SERIES1");
  });
});
