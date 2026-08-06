import { Body, Controller, Get, Post } from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { Form } from '../entities';

@Controller('forms')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  findOne(): Promise<Form | null> {
    return this.forms.findOne();
  }

  @Post()
  create(@Body() dto: CreateFormDto): Promise<Form> {
    return this.forms.create(dto);
  }
}
