/**
 * Utilitários para formatação e validação de telefones angolanos no backend
 * Formato padrão: +244 9XX XXX XXX
 */

/**
 * Converte telefone do formato antigo (244) 9XX-XXX-XXX para o novo +244 9XX XXX XXX
 * @param oldFormat - Telefone no formato antigo
 * @returns Telefone no formato novo
 */
export function convertOldPhoneFormat(oldFormat: string): string {
  if (!oldFormat) return oldFormat;

  // Remove todos os caracteres não numéricos
  const numbers = oldFormat.replace(/\D/g, '');
  
  // Se começar com 244, remove para pegar apenas os 9 dígitos locais
  let localNumbers = numbers;
  if (numbers.startsWith('244')) {
    localNumbers = numbers.substring(3);
  }
  
  // Verifica se tem 9 dígitos e começa com 9
  if (localNumbers.length === 9 && localNumbers.startsWith('9')) {
    return `+244 ${localNumbers.substring(0, 3)} ${localNumbers.substring(3, 6)} ${localNumbers.substring(6, 9)}`;
  }
  
  // Se não conseguir converter, retorna o original
  return oldFormat;
}

/**
 * Valida se um telefone está no formato correto (+244 9XX XXX XXX)
 * @param phone - Telefone formatado
 * @returns true se válido
 */
export function validateAngolanPhone(phone: string): boolean {
  if (!phone) return false;
  const phonePattern = /^\+244\s9\d{2}\s\d{3}\s\d{3}$/;
  return phonePattern.test(phone);
}

/**
 * Extrai apenas os números de um telefone formatado
 * @param phone - Telefone formatado (+244 9XX XXX XXX)
 * @returns Números puros (9XXXXXXXX)
 */
export function extractPhoneNumbers(phone: string): string {
  if (!phone) return '';
  
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('244')) {
    return numbers.substring(3);
  }
  return numbers;
}

/**
 * Normaliza um telefone para o formato padrão
 * Aceita vários formatos de entrada e converte para +244 9XX XXX XXX
 * @param phone - Telefone em qualquer formato
 * @returns Telefone normalizado ou string vazia se inválido
 */
export function normalizeAngolanPhone(phone: string): string {
  if (!phone) return '';

  // Remove todos os caracteres não numéricos
  let numbers = phone.replace(/\D/g, '');

  // Se começar com 244, remove
  if (numbers.startsWith('244')) {
    numbers = numbers.substring(3);
  }

  // Força começar com 9 se não começar
  if (numbers.length > 0 && !numbers.startsWith('9')) {
    numbers = '9' + numbers.substring(1);
  }

  // Limita a 9 dígitos
  if (numbers.length > 9) {
    numbers = numbers.substring(0, 9);
  }

  // Verifica se tem 9 dígitos e começa com 9
  if (numbers.length === 9 && numbers.startsWith('9')) {
    return `+244 ${numbers.substring(0, 3)} ${numbers.substring(3, 6)} ${numbers.substring(6, 9)}`;
  }

  return '';
}

/**
 * Middleware para converter telefones antigos em requests
 * @param phone - Telefone do request
 * @returns Telefone convertido para o novo formato
 */
export function preprocessPhoneInput(phone: string | undefined): string | undefined {
  if (!phone) return phone;
  
  // Se já está no formato novo, retorna como está
  if (validateAngolanPhone(phone)) {
    return phone;
  }
  
  // Tenta converter do formato antigo
  const converted = convertOldPhoneFormat(phone);
  if (validateAngolanPhone(converted)) {
    return converted;
  }
  
  // Tenta normalizar
  const normalized = normalizeAngolanPhone(phone);
  if (normalized) {
    return normalized;
  }
  
  // Se não conseguir converter, retorna o original para que a validação falhe
  return phone;
}
