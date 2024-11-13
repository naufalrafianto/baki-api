import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, ApiOkResponse } from '@nestjs/swagger';
import { BaseResponse } from '../types/response.type';

export const ApiBaseResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', items: { $ref: model.name } },
          message: { type: 'string' },
          meta: { type: 'object' },
        },
      },
    }),
  );
};
