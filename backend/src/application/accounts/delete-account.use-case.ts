import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AccountEntity } from '../../infrastructure/database/entities/account.entity';
import { JournalEntryEntity } from '../../infrastructure/database/entities/journal-entry.entity';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(userId: string, accountId: string) {
    return this.dataSource.transaction('SERIALIZABLE', async (entityManager) => {
      const account = await entityManager.findOne(AccountEntity, {
        where: { id: accountId, userId },
      });

      if (!account) {
        throw new NotFoundException(`Account with ID ${accountId} not found`);
      }

      // Check if there are journal entries associated
      const entriesCount = await entityManager.count(JournalEntryEntity, {
        where: { accountId },
      });

      if (entriesCount > 0) {
        // Soft delete / Logical deactivation
        account.status = 'INACTIVE';
        await entityManager.save(AccountEntity, account);
        return { success: true, action: 'DEACTIVATED' };
      } else {
        // Physical delete
        await entityManager.delete(AccountEntity, { id: accountId });
        return { success: true, action: 'DELETED' };
      }
    });
  }
}
