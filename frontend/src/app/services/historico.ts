import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import type { HistoricoItem } from '../models/HistoricoItem';
import type { PaginaResponse } from '../models/PaginaResponse';

// Consome o histórico de músicas acessadas pelo usuário autenticado (US16).
@Injectable({
  providedIn: 'root'
})
export class HistoricoService {

  private readonly apiUrl = `${environment.apiUrl}/api/historico`;

  constructor(
    private readonly http: HttpClient
  ) {}

  listar(
    pagina?: number,
    tamanho?: number
  ): Observable<PaginaResponse<HistoricoItem>> {
    let params = new HttpParams();

    if (pagina !== undefined) {
      params = params.set('page', pagina);
    }

    if (tamanho !== undefined) {
      params = params.set('size', tamanho);
    }

    return this.http
      .get<PaginaResponse<HistoricoItem>>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  private handleError(
    error: HttpErrorResponse
  ) {
    let errorMessage =
      'Ocorreu um erro desconhecido!';

    if (error.error instanceof ErrorEvent) {
      errorMessage =
        `Erro: ${error.error.message}`;
    } else {
      errorMessage =
        `Código do erro: ${error.status}\n` +
        `Mensagem: ${error.message}`;
    }

    console.error(errorMessage);

    return throwError(
      () => new Error(errorMessage)
    );
  }
}
