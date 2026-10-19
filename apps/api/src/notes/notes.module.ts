import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { NotesController } from './notes.controller';

@Module({ imports: [CrmModule], controllers: [NotesController] })
export class NotesModule {}
