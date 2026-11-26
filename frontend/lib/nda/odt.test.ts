import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { contentXml, createOdtZip, escapeXml, ODT_MIME } from "./odt";
import type { NdaDocument } from "./types";

const DOC: NdaDocument = [
  { type: "title", text: "Mutual Non-Disclosure Agreement" },
  { type: "heading", text: "Purpose", hint: "How Confidential Information may be used" },
  { type: "paragraph", runs: [{ text: "Talks between A & B <draft>" }] },
  { type: "paragraph", runs: [{ text: "Governing Law: " }, { text: "[Fill in state]", placeholder: true }] },
  {
    type: "partyTable",
    headers: ["Party 1", "Party 2"],
    rows: [{ label: "Notice Address", values: ["1 Main St\nSpringfield", ""] }],
  },
  { type: "title", text: "Standard Terms", pageBreakBefore: true },
  { type: "clause", number: 1, runs: [{ text: "Introduction", bold: true }, { text: ". See " }, { text: "here", href: "https://x.test/?a=1&b=2" }] },
];

describe("escapeXml", () => {
  it("escapes XML special characters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;",
    );
  });
});

describe("contentXml", () => {
  const xml = contentXml(DOC);

  it("escapes user text and keeps line breaks", () => {
    expect(xml).toContain("Talks between A &amp; B &lt;draft&gt;");
    expect(xml).toContain("1 Main St<text:line-break/>Springfield");
    expect(xml).not.toContain("<draft>");
  });

  it("maps blocks to ODF elements and styles", () => {
    expect(xml).toContain('<text:h text:style-name="P_Title" text:outline-level="1">Mutual Non-Disclosure Agreement</text:h>');
    expect(xml).toContain('<text:h text:style-name="P_TitleBreak" text:outline-level="1">Standard Terms</text:h>');
    expect(xml).toContain('<text:span text:style-name="T_Placeholder">[Fill in state]</text:span>');
    expect(xml).toContain('1. <text:span text:style-name="T_Bold">Introduction</text:span>');
    expect(xml).toContain('<text:a xlink:type="simple" xlink:href="https://x.test/?a=1&amp;b=2">here</text:a>');
    expect(xml).toContain('<table:table table:name="Parties" table:style-name="Tbl">');
  });
});

describe("createOdtZip", () => {
  it("writes a valid ODT package with an uncompressed mimetype entry first", async () => {
    const bytes = await createOdtZip(DOC).generateAsync({ type: "uint8array", compression: "DEFLATE" });

    // ZIP local file header: compression method at offset 8, file name at offset 30.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0); // stored, not deflated
    expect(new TextDecoder().decode(bytes.subarray(30, 38))).toBe("mimetype");

    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("mimetype")?.async("string")).toBe(ODT_MIME);
    expect(Object.keys(zip.files).sort()).toEqual(
      ["META-INF/manifest.xml", "content.xml", "meta.xml", "mimetype", "styles.xml"].sort(),
    );
    expect(await zip.file("content.xml")?.async("string")).toBe(contentXml(DOC));
  });
});
