import { Layer } from "effect";
import { ApplicationService } from "~/lib/services/ApplicationService";
import { CVService } from "~/lib/services/CVService";
import { JobImportService } from "~/lib/services/JobImportService";
import { QAService } from "~/lib/services/QAService";

export const AppLive = Layer.mergeAll(
  ApplicationService.Default,
  QAService.Default,
  JobImportService.Default,
  CVService.Default,
);
