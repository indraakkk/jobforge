import { Layer } from "effect";
import { ApplicationService } from "~/lib/services/ApplicationService";
import { JobImportService } from "~/lib/services/JobImportService";
import { QAService } from "~/lib/services/QAService";
import { StorageServiceStub } from "~/lib/services/StorageService";

export const AppLive = Layer.mergeAll(
  ApplicationService.Default,
  QAService.Default,
  JobImportService.Default,
  StorageServiceStub,
);
