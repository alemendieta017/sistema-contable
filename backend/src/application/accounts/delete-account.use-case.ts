import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

      // Check if there are journal entries or child accounts associated
      const [entriesCount, childrenCount] = await Promise.all([
        entityManager.count(JournalEntryEntity, {
          where: { accountId },
        }),
        entityManager.count(AccountEntity, {
          where: { parentId: accountId },
        }),
      ]);

      if (entriesCount > 0) {
        throw new BadRequestException(
          'Cannot delete account with existing transactions. Deactivate the account instead.',
        );
      }

      if (childrenCount > 0) {
        throw new BadRequestException(
          'Cannot delete account because it contains sub-accounts. Please reassign or delete sub-accounts first.',
        );
      }

      // Physical delete
      await entityManager.delete(AccountEntity, { id: accountId });
      return { success: true, action: 'DELETED' };
    });
  }
}
