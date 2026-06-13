import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageSender {
  LEAD = 'LEAD',
  IA = 'IA',
}

export class HistoricalMessageDto {
  @IsEnum(MessageSender)
  @IsNotEmpty()
  sender: MessageSender;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsDateString()
  @IsNotEmpty()
  createdAt: string;
}

export class CreateManualLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  // unitId is strictly required since Lead model in DB requires unitId relation
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HistoricalMessageDto)
  historicalMessages?: HistoricalMessageDto[];
}
