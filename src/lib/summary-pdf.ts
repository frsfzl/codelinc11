import { jsPDF } from "jspdf";
import { buildSummary, policyComparison } from "./summary";
import { currency, type ProfileState } from "./needs";

// Shared by the UI and export. No second AI call or independent calculation.
export async function createSummaryPdf(state: ProfileState, logo?: Uint8Array) {
  const summary = buildSummary(state);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = 499;
  const margin = 48;
  let y = 48;
  const primary = "#780032";
  const ink = "#202733";
  const muted = "#5C697A";
  const clean = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[—–−]/g, "-")
      .replace(/×/g, "x")
      .replace(/…/g, "...")
      .replace(/[^\x20-\x7E\n]/g, " ");
  function newPage() {
    doc.addPage();
    y = 48;
  }
  function reserve(height: number) {
    if (y + height > 774) newPage();
  }
  function text(value: string, size = 10, color = ink, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(clean(value), width) as string[];
    for (const line of lines) {
      reserve(size * 1.35);
      doc.text(line, margin, y + size);
      y += size * 1.35;
    }
    y += 3;
  }
  function heading(value: string) {
    reserve(60);
    y += 8;
    text(value, 13, primary, true);
  }
  function row(label: string, value: string, detail?: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(clean(label), 340) as string[];
    const detailLines = detail
      ? (doc.splitTextToSize(clean(detail), width) as string[])
      : [];
    reserve(lines.length * 14 + detailLines.length * 12 + 14);
    doc.setTextColor(ink);
    doc.text(lines, margin, y + 10);
    doc.setFont("helvetica", "bold");
    doc.text(clean(value), 547, y + 10, { align: "right" });
    y += lines.length * 14;
    if (detail) text(detail, 9, muted);
    doc.setDrawColor("#DFE6EE");
    doc.line(margin, y + 3, 547, y + 3);
    y += 9;
  }
  if (logo) {
    doc.addImage(logo, "PNG", margin, y, 128, 59);
    y += 64;
  }
  text("Your coverage summary", 25, primary, true);
  text(
    `${summary.status} | Revision ${state.revision} | ${new Date().toLocaleDateString("en-US")}`,
    9,
    muted,
  );
  text(
    "Educational planning summary. Not a policy quote or a guarantee.",
    9,
    muted,
  );
  heading("Your people and priorities");
  text(state.profile.dependents || "People or purpose still to discuss.");
  text(state.profile.priorities || "Priorities still to discuss.", 10, muted);
  if (summary.estimate) {
    reserve(98);
    y += 8;
    doc.setFillColor("#E5EFFB");
    doc.roundedRect(margin, y, width, 86, 8, 8, "F");
    doc.setTextColor(primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(27);
    doc.text(currency(summary.estimate.additional), margin + 18, y + 36);
    doc.setTextColor(ink);
    doc.setFontSize(10);
    doc.text(
      "Estimated additional life insurance coverage",
      margin + 18,
      y + 56,
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `${currency(summary.estimate.totalNeeds)} needs - ${currency(summary.estimate.totalResources)} resources (minimum $0)`,
      margin + 18,
      y + 73,
    );
    y += 102;
  } else {
    heading("A picture in progress");
    text(
      "No final coverage estimate is available. Remaining details must be clarified and the current numbers confirmed.",
    );
  }
  heading("The math behind your picture");
  summary.needs.forEach((item) =>
    row(item.label, currency(item.amount), item.detail),
  );
  if (summary.estimate)
    row("Total needs", currency(summary.estimate.totalNeeds));
  heading("Existing resources");
  summary.resources.forEach((item) =>
    row(
      item.label,
      currency(item.amount),
      item.amount === 0 ? "Explicitly excluded" : undefined,
    ),
  );
  if (summary.estimate)
    row(
      "Total coverage and allocated savings",
      currency(summary.estimate.totalResources),
    );
  if (summary.unknowns.length) {
    heading("Still to clarify");
    summary.unknowns.forEach((item) => text(`- ${item}`));
    text("Unknown amounts are not counted as zero.", 9, muted);
  }
  if (summary.estimate) newPage();
  heading("Term and whole life");
  policyComparison.forEach((item) => {
    reserve(80);
    text(item.label, 11, ink, true);
    text(`Term: ${item.term}`, 10, muted);
    text(`Whole life: ${item.whole}`, 10, muted);
  });
  heading("Tradeoffs in your situation");
  summary.tradeoffs.forEach((item) => {
    reserve(75);
    text(item.title, 11, ink, true);
    text(item.detail, 10, muted);
  });
  heading("Assumptions");
  summary.assumptions.forEach((item) => text(`- ${item}`, 9, muted));
  heading("Next steps");
  summary.nextSteps.forEach((item, index) => text(`${index + 1}. ${item}`));
  text(
    "Consumer education: https://content.naic.org/consumer/life-insurance.htm",
    8,
    muted,
  );
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(muted);
    doc.text(
      "Linc | Your coverage summary | Educational guidance",
      margin,
      810,
    );
    doc.text(`${page} / ${count}`, 547, 810, { align: "right" });
  }
  return doc;
}
