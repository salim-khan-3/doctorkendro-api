export const generateOtp = (length = 6): string => {
  const digits = '0123456789'
  let otp = ''
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)]
  }
  return otp
}

export const isOtpExpired = (expiry: Date | null): boolean => {
  if (!expiry) return true
  return new Date() > expiry
}

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const formatPhone = (phone: string): string => {
  phone = phone.replace(/\s+/g, '').replace(/-/g, '')
  if (phone.startsWith('0')) return '+92' + phone.slice(1)
  if (phone.startsWith('92')) return '+' + phone
  return phone
}

export const removeFields = <T extends object>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> => {
  const result = { ...obj }
  fields.forEach((field) => delete result[field])
  return result
}