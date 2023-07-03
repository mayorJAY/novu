import { Injectable } from '@nestjs/common';
import { JobRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  InstrumentUsecase,
} from '@novu/application-generic';

import { HandleLastFailedJobCommand } from './handle-last-failed-job.command';

import { QueueNextJob, QueueNextJobCommand } from '../queue-next-job';
import { RunJob, RunJobCommand } from '../run-job';
import { SendMessage, SendMessageCommand } from '../send-message';

@Injectable()
export class HandleLastFailedJob {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private queueNextJob: QueueNextJob,
    private runJob: RunJob,
    private jobRepository: JobRepository
  ) {}

  /**
   * TODO: IMPORTANT
   * We are going to assume that is not very likely that a job has to be retried the maximum default attempts.
   * That means that we could do a database call here to retrieve the job information for the ExecutionDetails
   * as it will be only happening for a small percentage of failed jobs.
   * This consideration is sensible as we are afraid of having to execute many database calls every time the
   * WorkflowQueueService pulls a job to run or queue again.
   */
  @InstrumentUsecase()
  public async execute(command: HandleLastFailedJobCommand): Promise<void> {
    const { jobId, error } = command;

    const hasToBackoff = this.runJob.shouldBackoff(error);

    if (hasToBackoff) {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new Error();
      }

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY,
          source: ExecutionDetailsSourceEnum.WEBHOOK,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: true,
          raw: JSON.stringify({ message: JSON.parse(error.message).message }),
        })
      );

      if (!job?.step?.shouldStopOnFail) {
        await this.queueNextJob.execute(
          QueueNextJobCommand.create({
            parentId: job?._id,
            environmentId: job?._environmentId,
            organizationId: job?._organizationId,
            userId: job?._userId,
          })
        );
      }
    }
  }
}
