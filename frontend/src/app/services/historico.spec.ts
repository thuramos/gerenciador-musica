import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HistoricoService } from './historico';
import type { HistoricoItem } from '../models/HistoricoItem';
import type { PaginaResponse } from '../models/PaginaResponse';

describe('HistoricoService', () => {
  let service: HistoricoService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:8080/api/historico';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HistoricoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(HistoricoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const montarPagina = (): PaginaResponse<HistoricoItem> => ({
    itens: [
      {
        idHistorico: 1,
        musica: {
          id: 5,
          titulo: 'Bohemian Rhapsody',
          artista: 'Queen',
          capaUrl: null
        },
        visualizadoEm: '2026-09-09T12:00:00Z'
      }
    ],
    paginaAtual: 0,
    tamanhoPagina: 20,
    totalItens: 1,
    totalPaginas: 1
  });

  it('deve listar o histórico sem parâmetros de paginação', () => {
    let resposta: PaginaResponse<HistoricoItem> | undefined;

    service.listar().subscribe(r => resposta = r);

    const requisicao = httpMock.expectOne(apiUrl);
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.keys().length).toBe(0);
    requisicao.flush(montarPagina());

    expect(resposta?.itens[0].musica.titulo).toBe('Bohemian Rhapsody');
    expect(resposta?.totalItens).toBe(1);
  });

  it('deve repassar página e tamanho como parâmetros de query', () => {
    service.listar(2, 10).subscribe();

    const requisicao = httpMock.expectOne(
      req => req.url === apiUrl
        && req.params.get('page') === '2'
        && req.params.get('size') === '10'
    );
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(montarPagina());
  });

  it('deve repassar uma mensagem de erro quando o servidor falhar', () => {
    let erro: Error | undefined;
    service.listar().subscribe({
      error: e => erro = e
    });

    httpMock.expectOne(apiUrl)
      .flush('Falha interna', { status: 500, statusText: 'Server Error' });

    expect(erro?.message).toContain('500');
  });

  it('deve repassar uma mensagem de erro quando a rede falhar', () => {
    let erro: Error | undefined;
    service.listar().subscribe({
      error: e => erro = e
    });

    httpMock.expectOne(apiUrl)
      .error(new ErrorEvent('network', { message: 'Sem conexão' }));

    expect(erro?.message).toContain('Sem conexão');
  });
});
