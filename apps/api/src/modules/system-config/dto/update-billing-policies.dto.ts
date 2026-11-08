import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, Max, Min } from 'class-validator';

export class UpdateBillingPoliciesDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  cutOffDayStart!: number;

  @ApiProperty({ example: 10, minimum: 1, maximum: 31 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  cutOffDayEnd!: number;

  @ApiProperty({ example: 2.5, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRatePercent!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  doublePaymentEnabled!: boolean;
}
