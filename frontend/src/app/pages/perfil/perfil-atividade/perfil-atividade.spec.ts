import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { HistoricoItem } from '../../../models/HistoricoItem';
import type { PerfilResponse } from '../../../models/Perfil';
import type { PlaylistResponse } from '../../../models/PlaylistResponse';
import type { Review } from '../../../models/Review';
import { PerfilAtividade } from './perfil-atividade';

describe('PerfilAtividade', () => {
  let fixture: ComponentFixture<PerfilAtividade>;

  const perfilDeExemplo: PerfilResponse = {
    idUsuario: 1,
    username: 'analiz',
    nome: 'Ana Liz',
    dataCadastro: '2026-01-01T12:00:00Z',
    role: 'USER',
    fotoUrl: null,
    bannerUrl: null,
    biografia: null,
    fraseDestaque: null,
    tipoDestaquePrincipal: null,
    artistaDestaque: null,
    musicaDestaque: null,
    albumDestaque: null,
    artistasFavoritos: [],
    albunsFavoritos: [],
    musicasFavoritas: [],
    totalMusicasAvaliadas: 4,
    totalAlbunsAvaliadas: 1
  };

  const reviewDeExemplo: Review = {
    idReview: 1,
    autor: { id: 1, nome: 'Ana Liz' },
    alvo: { tipo: 'MUSICA', id: 10, titulo: 'Por Supuesto', artista: 'Marina Sena', capaUrl: null },
    nota: 5,
    texto: null,
    criadaEm: '2026-01-01T00:00:00Z',
    atualizadaEm: '2026-01-01T00:00:00Z',
    minhaReview: true
  };

  const playlistDeExemplo: PlaylistResponse = {
    id: 1,
    nome: 'Favoritas',
    descricao: '',
    capaUrl: null,
    musicas: [],
    especial: false
  };

  const historicoDeExemplo: HistoricoItem = {
    idHistorico: 1,
    musica: { id: 10, titulo: 'Por Supuesto', artista: 'Marina Sena', capaUrl: null },
    visualizadoEm: '2026-01-01T00:00:00Z'
  };

  async function configurar(
    reviewsRecentes: Review[] = [],
    playlists: PlaylistResponse[] = [],
    historico: HistoricoItem[] = []
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PerfilAtividade],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilAtividade);
    fixture.componentRef.setInput('perfil', perfilDeExemplo);
    fixture.componentRef.setInput('reviewsRecentes', reviewsRecentes);
    fixture.componentRef.setInput('playlists', playlists);
    fixture.componentRef.setInput('historico', historico);
    fixture.detectChanges();
  }

  it('deve exibir as estatísticas de reviews do perfil', async () => {
    await configurar();

    const estatisticas = fixture.nativeElement.querySelectorAll('.estatisticas-reviews dd');
    expect(estatisticas[0].textContent.trim()).toBe('4');
    expect(estatisticas[1].textContent.trim()).toBe('1');
  });

  it('deve exibir as reviews recentes quando existirem', async () => {
    await configurar([reviewDeExemplo]);

    const cartoes = fixture.nativeElement.querySelectorAll('.reviews-lista-horizontal .review-card');
    expect(cartoes.length).toBe(1);
  });

  it('deve exibir mensagem de estado vazio quando não há reviews', async () => {
    await configurar();

    expect(fixture.nativeElement.querySelector('.reviews-recentes-area').textContent)
      .toContain('ainda não fez nenhuma review');
  });

  it('deve exibir as playlists quando existirem', async () => {
    await configurar([], [playlistDeExemplo]);

    const cartoes = fixture.nativeElement.querySelectorAll('.playlists-lista-horizontal .playlist-card');
    expect(cartoes.length).toBe(1);
    expect(cartoes[0].textContent).toContain('Favoritas');
  });

  it('deve exibir mensagem de estado vazio quando não há playlists', async () => {
    await configurar();

    expect(fixture.nativeElement.querySelector('.playlists-area').textContent)
      .toContain('ainda não criou nenhuma playlist');
  });

  it('deve exibir as músicas visualizadas recentemente quando existirem', async () => {
    await configurar([], [], [historicoDeExemplo]);

    const cartoes = fixture.nativeElement.querySelectorAll(
      '.historico-lista-horizontal .historico-card'
    );
    expect(cartoes.length).toBe(1);
    expect(cartoes[0].textContent).toContain('Por Supuesto');
    expect(cartoes[0].getAttribute('href')).toBe('/musicas/10');
  });

  it('deve exibir mensagem de estado vazio quando não há histórico', async () => {
    await configurar();

    expect(fixture.nativeElement.querySelector('.historico-area').textContent)
      .toContain('ainda não visualizou nenhuma música');
  });

  it('deve exibir a biografia ou uma mensagem padrão', async () => {
    await configurar();

    expect(fixture.nativeElement.querySelector('.sobre-area').textContent)
      .toContain('ainda não adicionou uma biografia');

    fixture.componentRef.setInput('perfil', {
      ...perfilDeExemplo,
      biografia: 'Pop brasileiro e descobertas independentes.'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sobre-area').textContent)
      .toContain('Pop brasileiro e descobertas independentes.');
  });
});
