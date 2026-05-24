/**
 * Normaliza o nome do setor (industry) para evitar duplicidade por grafia.
 * Ex: "Clínica de Estética", "clinica de estetica", "CLINICA DE ESTETICA" -> "CLINICA DE ESTETICA"
 */
export function normalizeIndustry(industry: string): string {
  if (!industry) return 'GERAL';

  return industry
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .replace(/\s+/g, ' '); // Remove espaços duplos
}
