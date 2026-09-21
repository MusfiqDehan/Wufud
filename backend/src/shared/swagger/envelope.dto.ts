import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorEnvelopeDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: "Authentication required." })
  message!: string;

  @ApiProperty({ example: "AUTHENTICATION_REQUIRED" })
  error_code!: string;

  @ApiPropertyOptional({
    example: { email: ["That email is already in use."] },
    description: "Field-level validation errors when present.",
  })
  errors?: Record<string, string[]>;
}

export class PaginationDto {
  @ApiProperty({ example: true })
  has_next!: boolean;

  @ApiProperty({ example: false })
  has_previous!: boolean;

  @ApiProperty({ example: 10 })
  page_size!: number;

  @ApiPropertyOptional({ example: "eyJpZCI6IjAxY..." })
  next_cursor?: string;

  @ApiPropertyOptional({ example: "eyJpZCI6IjAxY..." })
  previous_cursor?: string;
}

export class ListDataDto<T = unknown> {
  @ApiProperty({ isArray: true })
  items!: T[];

  @ApiPropertyOptional({ type: PaginationDto })
  pagination?: PaginationDto;

  @ApiPropertyOptional()
  meta?: Record<string, unknown>;
}

export class SuccessEnvelopeDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: "Operation successful." })
  message!: string;

  @ApiProperty()
  data!: T;
}
