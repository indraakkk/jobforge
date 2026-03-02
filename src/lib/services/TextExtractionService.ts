import { Context, Effect, Layer } from "effect";
import { ExtractionError } from "~/lib/errors";

export class TextExtractionService extends Context.Tag("TextExtractionService")<
  TextExtractionService,
  {
    readonly extract: (
      data: Uint8Array,
      fileType: string,
    ) => Effect.Effect<string, ExtractionError>;
  }
>() {}

export const TextExtractionServiceLive = Layer.succeed(TextExtractionService, {
  extract: (data: Uint8Array, fileType: string) =>
    Effect.gen(function* () {
      if (fileType === "application/pdf") {
        return yield* extractPdf(data);
      }
      if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        return yield* extractDocx(data);
      }
      return yield* new ExtractionError({ message: `Unsupported file type: ${fileType}` });
    }),
});

const extractPdf = (data: Uint8Array) =>
  Effect.tryPromise({
    try: async () => {
      const { PDFParse } = await import("pdf-parse");
      // Copy buffer — PDFParse transfers ownership to worker, detaching the original
      const pdf = new PDFParse({ data: data.slice() });
      const result = await pdf.getText();
      await pdf.destroy();
      return result.text;
    },
    catch: (error: unknown) =>
      new ExtractionError({ message: `PDF extraction failed: ${error}`, cause: error }),
  });

const extractDocx = (data: Uint8Array) =>
  Effect.tryPromise({
    try: async () => {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        arrayBuffer: data.buffer as ArrayBuffer,
      });
      return result.value;
    },
    catch: (error: unknown) =>
      new ExtractionError({ message: `DOCX extraction failed: ${error}`, cause: error }),
  });
