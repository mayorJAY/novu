import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository } from '@novu/dal';
import { UpdateTenantCommand } from './update-tenant.command';
import { TenantEntity } from '@novu/dal';

@Injectable()
export class UpdateTenant {
  constructor(private tenantRepository: TenantRepository) {}

  async execute(command: UpdateTenantCommand): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.identifier,
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with identifier: ${command.identifier} doesn't exist under environment ${command.environmentId}`
      );
    }

    const updatePayload: Partial<TenantEntity> = {};

    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.data) {
      updatePayload.data = command.data;
    }

    if (command?.newIdentifier && command?.newIdentifier !== tenant?.identifier) {
      await this.validateIdentifierDuplication({
        environmentId: command.environmentId,
        identifier: command.newIdentifier,
      });

      updatePayload.identifier = command.newIdentifier;
    }

    await this.tenantRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.identifier,
        _id: tenant._id,
      },
      {
        $set: updatePayload,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (await this.tenantRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _id: tenant._id,
    }))!;
  }

  private async validateIdentifierDuplication({
    environmentId,
    identifier,
  }: {
    environmentId: string;
    identifier: string;
  }) {
    const tenantExist = await this.tenantRepository.findOne({
      _environmentId: environmentId,
      identifier: identifier,
    });

    if (tenantExist) {
      throw new BadRequestException(
        `Tenant with identifier: ${identifier} already exists under environment ${environmentId}`
      );
    }
  }
}