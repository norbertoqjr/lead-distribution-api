import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Form } from '../entities';
import { CreateFormDto } from './dto/create-form.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form) private readonly forms: Repository<Form>,
  ) {}

  /** The single form, or null before one is created. */
  findOne(): Promise<Form | null> {
    return this.forms.findOne({ where: { singleton: true } });
  }

  async findBySlug(slug: string): Promise<Form> {
    const form = await this.forms.findOne({ where: { slug } });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async create(dto: CreateFormDto): Promise<Form> {
    const existing = await this.findOne();

    if (existing) {
      throw new ConflictException('A form already exists. Only one is allowed.');
    }

    try {
      return await this.forms.save(this.forms.create({ ...dto, singleton: true }));
    } catch (error) {
      // The unique indexes are the real guard: two concurrent creates both
      // pass the check above, and the database rejects the loser.
      if (error instanceof QueryFailedError) {
        const message = (error as { code?: string }).code;
        if (message === 'ER_DUP_ENTRY') {
          throw new ConflictException(
            'That slug is taken, or a form already exists.',
          );
        }
      }
      throw error;
    }
  }
}
