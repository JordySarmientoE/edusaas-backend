import { PaginatedResultDto } from '../dto/paginated-result.dto';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResultDto<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}
