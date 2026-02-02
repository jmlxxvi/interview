export const ApiResponse = (error = null, code = 0, data = null, message = 'ok') => {
  return {
    data,
    error,
    code,
    message
  }
}

export const ApiResponseNotAuthorized = () => {
  return ApiResponse(true, 1002, null, 'Not authorized')
}

export const ApiResponseSelect = (isError, codeError, messageError, dataOk) => {
  if (isError) {
    return ApiResponse(true, codeError, null, messageError)
  }
  return ApiResponse(false, 1000, dataOk, 'ok')
}

export const ApiResponseResult = (result, codeError) => {
  if (result.isError()) {
    return ApiResponse(true, codeError, null, result.error?.message || result.error || 'Unknown error')
  }
  return ApiResponse(false, 1000, result.value, 'ok')
}

export const ApiResponseError = (code, message = 'Error occurred') => {
  return ApiResponse(true, code, null, message)
}

export const ApiResponseOk = (data = null, message = 'ok') => {
  return ApiResponse(false, 1000, data, message)
}
