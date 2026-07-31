import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

@Injectable()
export class UpdateAccountUseCase {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    dto: { name?: string; isCashOrBank?: boolean },
  ): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (entityManager) => {
      const account = await entityManager.findOne(AccountEntity, {
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      if (dto.isCashOrBank !== undefined && dto.isCashOrBank !== account.isCashOrBank) {
        const entryCount = await entityManager.count(JournalEntryEntity, {
          where: { accountId },
        });

        if (entryCount > 0) {
          throw new BadRequestException(
            'Cannot change the Cash/Bank flag of an account that already has transactions associated',
          );
        }

        account.isCashOrBank = dto.isCashOrBank;
      }

      if (dto.name !== undefined) {
        account.name = dto.name;
      }

      await entityManager.save(AccountEntity, account);

      return { success: true };
    });
  }
}
