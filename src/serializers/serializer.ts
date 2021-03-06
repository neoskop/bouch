import { Doc } from '../utils/couchdb-api';

export interface Attachment {
    content_type: string;
    content: Buffer;
}

export type Attachments = { [name: string]: Attachment };

export interface BackupDocument {
    doc: Doc<{}>;
    attachments: Attachments
}

export type BackupDocuments = BackupDocument[];

export interface ISerializer {
    serialize(docs: BackupDocuments): Buffer;
    serializeMulti(dbs : { [name: string]: BackupDocuments }) : Buffer;
    deserialize(buffer: Buffer): BackupDocuments;
    deserializeMulti(buffer: Buffer): { [name: string]: BackupDocuments };
}