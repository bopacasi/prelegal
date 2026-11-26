import JSZip from "jszip";
import type { Block, Inline, NdaDocument } from "./types";

/**
 * Writes an NdaDocument as an OpenDocument Text (.odt) file.
 *
 * An .odt file is a ZIP archive. The "mimetype" entry must come first and be
 * stored uncompressed; the document itself is content.xml, with page setup
 * in styles.xml.
 */

export const ODT_MIME = "application/vnd.oasis.opendocument.text";

const NAMESPACES = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
].join(" ");

const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Escape text, turning newlines into ODF line breaks. */
function textXml(text: string): string {
  return text.split(/\r?\n/).map(escapeXml).join("<text:line-break/>");
}

function runXml(run: Inline): string {
  let xml = textXml(run.text);
  if (run.placeholder) xml = `<text:span text:style-name="T_Placeholder">${xml}</text:span>`;
  else if (run.bold) xml = `<text:span text:style-name="T_Bold">${xml}</text:span>`;
  if (run.href) {
    xml = `<text:a xlink:type="simple" xlink:href="${escapeXml(run.href)}">${xml}</text:a>`;
  }
  return xml;
}

const runsXml = (runs: Inline[]) => runs.map(runXml).join("");

function cell(content: string, style = "P_Cell"): string {
  return `<table:table-cell table:style-name="Cell" office:value-type="string"><text:p text:style-name="${style}">${content}</text:p></table:table-cell>`;
}

function blockXml(block: Block): string {
  switch (block.type) {
    case "title": {
      const style = block.pageBreakBefore ? "P_TitleBreak" : "P_Title";
      return `<text:h text:style-name="${style}" text:outline-level="1">${textXml(block.text)}</text:h>`;
    }
    case "heading": {
      const heading = `<text:h text:style-name="P_Heading" text:outline-level="2">${textXml(block.text)}</text:h>`;
      return block.hint
        ? heading + `<text:p text:style-name="P_Hint">${textXml(block.hint)}</text:p>`
        : heading;
    }
    case "paragraph":
      return `<text:p text:style-name="${block.small ? "P_Small" : "P_Body"}">${runsXml(block.runs)}</text:p>`;
    case "clause":
      return `<text:p text:style-name="P_Clause">${block.number}. ${runsXml(block.runs)}</text:p>`;
    case "partyTable": {
      const header =
        "<table:table-row>" +
        cell("") +
        block.headers.map((h) => cell(textXml(h), "P_CellHeader")).join("") +
        "</table:table-row>";
      const rows = block.rows
        .map((row) => {
          const label =
            `<text:span text:style-name="T_Bold">${textXml(row.label)}</text:span>` +
            (row.hint ? `<text:line-break/><text:span text:style-name="T_Hint">${textXml(row.hint)}</text:span>` : "");
          const rowStyle = row.tall ? ' table:style-name="R_Tall"' : "";
          return (
            `<table:table-row${rowStyle}>` +
            cell(label) +
            row.values.map((v) => cell(textXml(v))).join("") +
            "</table:table-row>"
          );
        })
        .join("");
      return (
        '<table:table table:name="Parties" table:style-name="Tbl">' +
        '<table:table-column table:style-name="ColLabel"/>' +
        '<table:table-column table:style-name="ColParty" table:number-columns-repeated="2"/>' +
        header +
        rows +
        "</table:table>"
      );
    }
  }
}

const CONTENT_STYLES = `
<style:style style:name="P_Title" style:family="paragraph"><style:paragraph-properties fo:text-align="center" fo:margin-top="0cm" fo:margin-bottom="0.4cm"/><style:text-properties fo:font-size="16pt" fo:font-weight="bold"/></style:style>
<style:style style:name="P_TitleBreak" style:family="paragraph"><style:paragraph-properties fo:break-before="page" fo:text-align="center" fo:margin-top="0cm" fo:margin-bottom="0.4cm"/><style:text-properties fo:font-size="16pt" fo:font-weight="bold"/></style:style>
<style:style style:name="P_Heading" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.35cm" fo:margin-bottom="0.1cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="11pt" fo:font-weight="bold"/></style:style>
<style:style style:name="P_Hint" style:family="paragraph"><style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.1cm" fo:keep-with-next="always"/><style:text-properties fo:font-size="8.5pt" fo:font-style="italic" fo:color="#555555"/></style:style>
<style:style style:name="P_Body" style:family="paragraph"><style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.2cm"/></style:style>
<style:style style:name="P_Small" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0cm"/><style:text-properties fo:font-size="8.5pt" fo:color="#555555"/></style:style>
<style:style style:name="P_Clause" style:family="paragraph"><style:paragraph-properties fo:text-align="justify" fo:margin-top="0cm" fo:margin-bottom="0.25cm"/></style:style>
<style:style style:name="P_Cell" style:family="paragraph"><style:text-properties fo:font-size="10pt"/></style:style>
<style:style style:name="P_CellHeader" style:family="paragraph"><style:paragraph-properties fo:text-align="center"/><style:text-properties fo:font-size="10pt" fo:font-weight="bold"/></style:style>
<style:style style:name="T_Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="T_Hint" style:family="text"><style:text-properties fo:font-size="8pt" fo:font-style="italic" fo:color="#555555"/></style:style>
<style:style style:name="T_Placeholder" style:family="text"><style:text-properties fo:background-color="#ffe8a3"/></style:style>
<style:style style:name="Tbl" style:family="table"><style:table-properties style:width="16.9cm" table:align="margins" fo:margin-top="0.2cm" fo:margin-bottom="0.2cm"/></style:style>
<style:style style:name="ColLabel" style:family="table-column"><style:table-column-properties style:column-width="4.9cm"/></style:style>
<style:style style:name="ColParty" style:family="table-column"><style:table-column-properties style:column-width="6cm"/></style:style>
<style:style style:name="R_Tall" style:family="table-row"><style:table-row-properties style:min-row-height="1.2cm"/></style:style>
<style:style style:name="Cell" style:family="table-cell"><style:table-cell-properties fo:padding="0.1cm" fo:border="0.5pt solid #000000"/></style:style>`;

export function contentXml(doc: NdaDocument): string {
  return (
    XML_DECL +
    `<office:document-content ${NAMESPACES} office:version="1.3">` +
    `<office:automatic-styles>${CONTENT_STYLES}</office:automatic-styles>` +
    `<office:body><office:text>${doc.map(blockXml).join("")}</office:text></office:body>` +
    "</office:document-content>"
  );
}

// US Letter with 2.3 cm margins, matching the 16.9 cm wide party table.
const STYLES_XML =
  XML_DECL +
  `<office:document-styles ${NAMESPACES} office:version="1.3">` +
  '<office:styles><style:default-style style:family="paragraph"><style:text-properties fo:font-family="Times New Roman" fo:font-size="10.5pt"/></style:default-style></office:styles>' +
  '<office:automatic-styles><style:page-layout style:name="PL"><style:page-layout-properties fo:page-width="21.59cm" fo:page-height="27.94cm" style:print-orientation="portrait" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.3cm" fo:margin-right="2.3cm"/></style:page-layout></office:automatic-styles>' +
  '<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="PL"/></office:master-styles>' +
  "</office:document-styles>";

const META_XML =
  XML_DECL +
  `<office:document-meta ${NAMESPACES} office:version="1.3"><office:meta>` +
  "<meta:generator>Prelegal</meta:generator><dc:title>Mutual Non-Disclosure Agreement</dc:title>" +
  "</office:meta></office:document-meta>";

const MANIFEST_XML =
  XML_DECL +
  '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">' +
  `<manifest:file-entry manifest:full-path="/" manifest:version="1.3" manifest:media-type="${ODT_MIME}"/>` +
  '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
  '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
  '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>' +
  "</manifest:manifest>";

/** Assemble the .odt archive. Call generateAsync() on the result. */
export function createOdtZip(doc: NdaDocument): JSZip {
  const zip = new JSZip();
  // Must be the first entry and uncompressed, so tools can sniff the type.
  zip.file("mimetype", ODT_MIME, { compression: "STORE" });
  zip.file("META-INF/manifest.xml", MANIFEST_XML, { createFolders: false });
  zip.file("content.xml", contentXml(doc));
  zip.file("styles.xml", STYLES_XML);
  zip.file("meta.xml", META_XML);
  return zip;
}

export function buildOdtBlob(doc: NdaDocument): Promise<Blob> {
  return createOdtZip(doc).generateAsync({
    type: "blob",
    mimeType: ODT_MIME,
    compression: "DEFLATE",
  });
}
