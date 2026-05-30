import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SourceLeadsUseCase } from '../../application/use-cases/source-leads.use-case';
import { TenantContextService } from '../../../../common/utils/tenant-context/tenant-context.service';

@Processor('proactive-prospecting')
export class ProactiveProspectingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProactiveProspectingProcessor.name);

  constructor(
    private readonly sourceLeads: SourceLeadsUseCase,
    private readonly tenantContext: TenantContextService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { sector, region, organizationId, unitId } = job.data;

    this.logger.log(`Background Proactive Search: ${sector} in ${region} (Org: ${organizationId})`);

    // Execute within Tenant Context for isolation
    return this.tenantContext.run(
      { organizationId, unitId },
      () => this.sourceLeads.execute({
        sector,
        region,
        organizationId,
        unitId,
      }),
    );
  }
}
