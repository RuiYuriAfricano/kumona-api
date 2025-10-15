import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { preprocessPhoneInput } from '../utils/phone.utils';

/**
 * Interceptor para converter automaticamente telefones do formato antigo para o novo
 * em todos os requests que contêm campos de telefone
 */
@Injectable()
export class PhoneFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    if (request.body) {
      this.processPhoneFields(request.body);
    }
    
    return next.handle();
  }

  private processPhoneFields(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Lista de campos que podem conter telefones
    const phoneFields = ['phone', 'supportPhone', 'contactPhone'];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // Se é um campo de telefone, processa
        if (phoneFields.includes(key) && typeof value === 'string') {
          obj[key] = preprocessPhoneInput(value);
        }
        // Se é um objeto, processa recursivamente
        else if (typeof value === 'object' && value !== null) {
          this.processPhoneFields(value);
        }
      }
    }
  }
}
