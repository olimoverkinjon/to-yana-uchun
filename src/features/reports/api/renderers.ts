import "server-only";

import type { ReportDocument } from "./report-data";

/**
 * Renders a ReportDocument to each supported format.
 *
 * All three run on the server. That is not incidental: exceljs and jsPDF are
 * together well over half a megabyte, and this app is a Telegram Mini App that
 * has to open fast on a phone. Rendering here keeps them out of the client
 * bundle entirely, and means the Super Admin check happens before a single
 * byte of the report is built.
 */

/**
 * Escapes a CSV field.
 *
 * The leading-character guard is the important part. A cell beginning =, +, -
 * or @ is interpreted as a formula by Excel and Sheets, so a giver named
 * "=cmd|..." becomes code the moment someone opens the export. Giver names and
 * descriptions here are free text typed by a user, which makes this a real
 * injection path, not a theoretical one. Prefixing a tab keeps the value
 * readable while stopping the spreadsheet evaluating it.
 */
function csvCell(value: string | number): string {
  const raw = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `\t${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function renderCsv(report: ReportDocument): string {
  const lines: string[] = [];

  lines.push(csvCell(report.title));
  if (report.subtitle) lines.push(csvCell(report.subtitle));
  lines.push(csvCell(`Generated: ${report.generatedAt}`));
  lines.push("");

  for (const { label, value } of report.summary) {
    lines.push([csvCell(label), csvCell(value)].join(","));
  }

  for (const table of report.tables) {
    lines.push("");
    lines.push(csvCell(table.title));
    lines.push(table.columns.map(csvCell).join(","));
    for (const row of table.rows) {
      lines.push(row.map(csvCell).join(","));
    }
  }

  // A BOM, so Excel opens UTF-8 as UTF-8. Without it, Uzbek and Russian names
  // arrive as mojibake — which for a ledger of people's names is not a cosmetic
  // problem.
  return "﻿" + lines.join("\r\n");
}

export async function renderXlsx(report: ReportDocument): Promise<Buffer> {
  // Imported lazily so the route's other formats do not pay for exceljs.
  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(report.title.slice(0, 31) || "Report");

  const titleRow = sheet.addRow([report.title]);
  titleRow.font = { bold: true, size: 14 };
  if (report.subtitle) sheet.addRow([report.subtitle]).font = { size: 11, color: { argb: "FF666666" } };
  sheet.addRow([`Generated: ${report.generatedAt}`]).font = { size: 9, color: { argb: "FF999999" } };
  sheet.addRow([]);

  for (const { label, value } of report.summary) {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
  }

  for (const table of report.tables) {
    sheet.addRow([]);
    sheet.addRow([table.title]).font = { bold: true, size: 12 };

    const header = sheet.addRow(table.columns);
    header.font = { bold: true };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F1F5" } };
    });

    for (const row of table.rows) {
      sheet.addRow(row);
    }
  }

  // Rough auto-fit: exceljs cannot measure text, so this samples the column's
  // longest value. Better than every column being default width and every name
  // being truncated.
  sheet.columns.forEach((column) => {
    let longest = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      longest = Math.max(longest, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(longest, 50);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function renderPdf(report: ReportDocument, appName: string): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  let cursorY = margin;

  // The wordmark stands in for a logo: the project has no logo asset, and
  // embedding a placeholder image would put a fake brand on a real document.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(appName, margin, cursorY);
  cursorY += 22;

  doc.setFontSize(13);
  doc.text(report.title, margin, cursorY);
  cursorY += 16;

  if (report.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(report.subtitle, margin, cursorY);
    cursorY += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generated: ${report.generatedAt}`, margin, cursorY);
  cursorY += 18;
  doc.setTextColor(0);

  if (report.summary.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 160 } },
      body: report.summary.map(({ label, value }) => [label, value]),
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  for (const table of report.tables) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(table.title, margin, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [table.columns],
      body: table.rows.map((row) => row.map((cell) => String(cell ?? ""))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [43, 58, 103], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      margin: { left: margin, right: margin },
    });
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${appName} — ${page} / ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}
