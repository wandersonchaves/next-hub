export function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  
  // Se tiver 10 ou 11 dígitos (DDD + número), adiciona o 55 do Brasil obrigatoriamente
  if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
    clean = `55${clean}`;
  }
  
  return clean;
}
