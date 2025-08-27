import { type NextRequest, NextResponse } from "next/server"
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Header,
  Footer,
  PageNumber,
} from "docx"

export async function POST(request: NextRequest) {
  try {
    const { title, content, type, generatedAt, jsonData } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const sections = []
    const tocEntries = []
    const footnotes = []

    // Helper function to extract citations and create footnotes
    const processCitations = (text: string, citations: any[] = []) => {
      if (!citations || citations.length === 0) return [new TextRun({ text, size: 22 })]

      const runs = [new TextRun({ text, size: 22 })]
      citations.forEach((citation, index) => {
        const footnoteNumber = footnotes.length + 1
        footnotes.push(`${footnoteNumber}. Source: ${citation.source || "Unknown"}, p.${citation.page || "N/A"}`)
        runs.push(new TextRun({ text: ` [${footnoteNumber}]`, size: 18, superScript: true }))
      })
      return runs
    }

    // Create cover page
    const coverPage = [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 48,
            color: "1f2937",
          }),
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 800 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: type.toUpperCase(),
            bold: true,
            size: 24,
            color: "059669",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${new Date(generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`,
            italics: true,
            size: 20,
            color: "6b7280",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "TsachalGPT Document Generation System",
            size: 18,
            color: "9ca3af",
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ]

    // Process content and build TOC
    const contentSections = []
    const lines = content.split("\n")
    const currentSection = null

    for (const line of lines) {
      if (line.trim() === "") {
        contentSections.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            spacing: { after: 200 },
          }),
        )
        continue
      }

      // Handle headers and build TOC
      if (line.startsWith("#")) {
        const headerLevel = (line.match(/^#+/) || [""])[0].length
        const headerText = line.replace(/^#+\s*/, "")

        // Add to TOC
        tocEntries.push({
          text: headerText,
          level: headerLevel,
        })

        let heading: HeadingLevel
        let fontSize = 24

        switch (headerLevel) {
          case 1:
            heading = HeadingLevel.HEADING_1
            fontSize = 32
            break
          case 2:
            heading = HeadingLevel.HEADING_2
            fontSize = 28
            break
          case 3:
            heading = HeadingLevel.HEADING_3
            fontSize = 24
            break
          default:
            heading = HeadingLevel.HEADING_4
            fontSize = 20
        }

        contentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: headerText,
                bold: true,
                size: fontSize,
                color: "1f2937",
              }),
            ],
            heading,
            spacing: { before: 600, after: 300 },
          }),
        )
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        // Handle bullet points
        const bulletText = line.replace(/^[-*]\s*/, "")
        contentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${bulletText}`,
                size: 22,
              }),
            ],
            spacing: { after: 150 },
            indent: { left: 600 },
          }),
        )
      } else {
        // Regular paragraph with potential citations
        const citations = jsonData?.citations || []
        const runs = processCitations(line, citations)

        contentSections.push(
          new Paragraph({
            children: runs,
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          }),
        )
      }
    }

    // Create Table of Contents
    const tocSection = [
      new Paragraph({
        children: [
          new TextRun({
            text: "Table of Contents",
            bold: true,
            size: 28,
            color: "1f2937",
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
    ]

    tocEntries.forEach((entry, index) => {
      const indent = (entry.level - 1) * 400
      tocSection.push(
        new Paragraph({
          children: [
            new TextRun({
              text: entry.text,
              size: entry.level === 1 ? 22 : 20,
              bold: entry.level === 1,
            }),
            new TextRun({
              text: `\t${index + 1}`,
              size: 20,
            }),
          ],
          indent: { left: indent },
          spacing: { after: 100 },
        }),
      )
    })

    // Create styled tables if JSON data contains tabular information
    if (jsonData?.tables) {
      jsonData.tables.forEach((tableData: any) => {
        contentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: tableData.title || "Data Table",
                bold: true,
                size: 24,
                color: "1f2937",
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
        )

        const tableRows = tableData.rows.map((row: any[], rowIndex: number) => {
          return new TableRow({
            children: row.map(
              (cell: any) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: String(cell),
                          size: 20,
                          bold: rowIndex === 0,
                        }),
                      ],
                    }),
                  ],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                }),
            ),
          })
        })

        const table = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })

        contentSections.push(table)
      })
    }

    // Add footnotes section
    if (footnotes.length > 0) {
      contentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "References",
              bold: true,
              size: 24,
              color: "1f2937",
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 800, after: 300 },
        }),
      )

      footnotes.forEach((footnote) => {
        contentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: footnote,
                size: 18,
              }),
            ],
            spacing: { after: 100 },
          }),
        )
      })
    }

    // Create document with headers and footers
    const doc = new Document({
      sections: [
        // Cover page section
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          children: coverPage,
        },
        // TOC section
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: title,
                      size: 18,
                      color: "6b7280",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Page ",
                      size: 16,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: tocSection,
        },
        // Content section
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: title,
                      size: 18,
                      color: "6b7280",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "Page ",
                      size: 16,
                    }),
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      size: 16,
                    }),
                    new TextRun({
                      text: ` • Generated by TsachalGPT on ${new Date().toLocaleDateString()}`,
                      size: 14,
                      color: "9ca3af",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          },
          children: contentSections,
        },
      ],
    })

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx"`,
      },
    })
  } catch (error) {
    console.error("DOCX export error:", error)
    return NextResponse.json({ error: "Failed to export DOCX" }, { status: 500 })
  }
}
