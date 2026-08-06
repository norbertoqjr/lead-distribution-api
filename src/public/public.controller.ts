import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { FormsService } from '../forms/forms.service';
import { AssignmentService } from '../distribution/assignment.service';
import { SubmitLeadDto } from './dto/submit-lead.dto';
import { getClientIp } from './client-ip';

type PublicForm = { name: string; slug: string };

@Controller('public')
export class PublicController {
  constructor(
    private readonly forms: FormsService,
    private readonly assignment: AssignmentService,
  ) {}

  @Public()
  @Get('forms/:slug')
  async findForm(@Param('slug') slug: string): Promise<PublicForm> {
    const form = await this.forms.findBySlug(slug);
    // Only what the page needs to render — no ids or internal flags.
    return { name: form.name, slug: form.slug };
  }

  @Public()
  @Post('forms/:slug/submit')
  async submit(
    @Param('slug') slug: string,
    @Body() dto: SubmitLeadDto,
    @Req() request: Request,
  ): Promise<{ ok: true }> {
    const form = await this.forms.findBySlug(slug);

    await this.assignment.submit(form, {
      name: dto.name,
      email: dto.email,
      phone: dto.phone ?? null,
      ipAddress: getClientIp(request),
    });

    // The visitor is never told whether their lead was routed, duplicated, or
    // queued — that is admin information.
    return { ok: true };
  }
}
