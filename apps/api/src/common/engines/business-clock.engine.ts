import { Injectable } from '@nestjs/common';

@Injectable()
export class BusinessClockEngine {
  /**
   * Verifica se o momento atual está dentro do horário comercial.
   * Padrão: Segunda a Sexta, das 08:00 às 18:00.
   */
  isBusinessHours(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Domingo, 6 = Sábado
    const hour = now.getHours();

    // Bloqueia Domingo (0) e Sábado (6)
    if (day === 0 || day === 6) {
      return false;
    }

    // Verifica intervalo de horas (08:00 às 17:59)
    if (hour < 8 || hour >= 18) {
      return false;
    }

    return true;
  }

  /**
   * Retorna uma estimativa de quando será o próximo horário comercial.
   */
  getNextBusinessOpening(): Date {
    const next = new Date();
    next.setMinutes(0);
    next.setSeconds(0);
    
    const day = next.getDay();
    const hour = next.getHours();

    if (day >= 1 && day <= 5 && hour < 8) {
      // É dia útil mas antes das 8h
      next.setHours(8);
    } else {
      // É fim de semana ou depois das 18h, pula para o próximo dia às 8h
      next.setDate(next.getDate() + 1);
      next.setHours(8);
      
      // Se caiu no sábado, pula para segunda
      if (next.getDay() === 6) next.setDate(next.getDate() + 2);
      // Se caiu no domingo, pula para segunda
      if (next.getDay() === 0) next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
}
