export class ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }

  constructor(
    success: boolean,
    message: string,
    data?: T,
    meta?: ApiResponse['meta']
  ) {
    this.success = success
    this.message = message
    if (data !== undefined) this.data = data
    if (meta !== undefined) this.meta = meta
  }

  static success<T>(message: string, data?: T, meta?: ApiResponse['meta']) {
    return new ApiResponse<T>(true, message, data, meta)
  }

  static error(message: string) {
    return new ApiResponse(false, message)
  }
}