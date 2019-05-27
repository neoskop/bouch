import { ICompressor } from '../compressors/compressor';
import { ISerializer } from '../serializers/serializer';
import { IBackupArgs, IMigrateArgs, IRestoreArgs } from '../utils/args';
import { multiBackup } from './multi/backup';
import { multiMigrate } from './multi/migrate';
import { multiRestore } from './multi/restore';
import { singleBackup } from './single/backup';
import { singleMigrate } from './single/migrate';
import { singleRestore } from './single/restore';

export interface ICommand<T> {
    (args: T, options: { serializer: ISerializer, compressor: ICompressor }): Promise<void>
}

export type Args = {
    backup: IBackupArgs,
    restore: IRestoreArgs,
    migrate: IMigrateArgs
}

export class CommandFactory {
    protected commands = new Map<'backup' | 'restore' | 'migrate', Map<'single' | 'multi', ICommand<any>>>([
        ['backup', new Map<'single' | 'multi', ICommand<any>>([
            ['single', singleBackup],
            ['multi', multiBackup]
        ])],
        ['restore', new Map<'single' | 'multi', ICommand<any>>([
            ['single', singleRestore],
            ['multi', multiRestore]
        ])],
        ['migrate', new Map<'single' | 'multi', ICommand<any>>([
            ['single', singleMigrate],
            ['multi', multiMigrate]
        ])]
    ]);

    get<T extends keyof Args>(type: T, mode: 'single' | 'multi'): ICommand<Args[T]> {
        return this.commands.get(type)!.get(mode)!;
    }
}