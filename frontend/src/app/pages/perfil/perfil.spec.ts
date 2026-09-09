import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import type { HistoricoItem } from '../../models/HistoricoItem';
import type { MusicaListagem } from '../../models/MusicaListagem';
import type { PaginaResponse } from '../../models/PaginaResponse';
import type { PerfilResponse } from '../../models/Perfil';
import type { PlaylistResponse } from '../../models/PlaylistResponse';
import type { Review } from '../../models/Review';
import { CatalogoService } from '../../services/catalogo';
import { HistoricoService } from '../../services/historico';
import { MusicaService } from '../../services/musica';
import { PerfilService } from '../../services/perfil';
import { PlaylistService } from '../../services/playlist';
import { ReviewService } from '../../services/review';
import { Perfil } from './perfil';

describe('Perfil', () => {
  let component: Perfil;
  let fixture: ComponentFixture<Perfil>;
  let perfilServiceMock: {
    obter: ReturnType<typeof vi.fn>;
    atualizar: ReturnType<typeof vi.fn>;
  };
  let musicaServiceMock: {
    pesquisar: ReturnType<typeof vi.fn>;
    buscarPorId: ReturnType<typeof vi.fn>;
  };
  let catalogoServiceMock: {
    listarArtistas: ReturnType<typeof vi.fn>;
    listarAlbuns: ReturnType<typeof vi.fn>;
  };
  let reviewServiceMock: {
    listarMinhas: ReturnType<typeof vi.fn>;
  };
  let playlistServiceMock: {
    listarMinhas: ReturnType<typeof vi.fn>;
  };
  let historicoServiceMock: {
    listar: ReturnType<typeof vi.fn>;
  };

  const perfil: PerfilResponse = {
    idUsuario: 1,
    username: 'analiz',
    nome: 'Ana Liz Novaes',
    dataCadastro: '2026-01-01T12:00:00Z',
    role: 'USER',
    fotoUrl: 'https://exemplo.com/foto.jpg',
    bannerUrl: 'https://exemplo.com/banner.jpg',
    biografia: 'Entre pop brasileiro e descobertas independentes.',
    fraseDestaque: 'Uma trilha para cada fase.',
    tipoDestaquePrincipal: 'MUSICA',
    artistaDestaque: null,
    musicaDestaque: {
      tipo: 'MUSICA', id: 10, titulo: 'Por Supuesto',
      subtitulo: 'Marina Sena', imagemUrl: null
    },
    albumDestaque: null,
    artistasFavoritos: [{
      tipo: 'ARTISTA', id: 5, titulo: 'Marina Sena',
      subtitulo: 'Artista', imagemUrl: null
    }],
    albunsFavoritos: [],
    musicasFavoritas: [],
    totalMusicasAvaliadas: 4,
    totalAlbunsAvaliadas: 1
  };

  beforeEach(async () => {
    perfilServiceMock = {
      obter: vi.fn().mockReturnValue(of(perfil)),
      atualizar: vi.fn().mockReturnValue(of({ ...perfil, nome: 'Ana' }))
    };
    musicaServiceMock = {
      pesquisar: vi.fn().mockReturnValue(of(paginaMusicas([]))),
      buscarPorId: vi.fn().mockReturnValue(of(musicaFavorita()))
    };

    catalogoServiceMock = {
      listarArtistas: vi.fn().mockReturnValue(of([
        {
          idArtista: 5,
          nome: 'Marina Sena',
          nomeCompleto: 'Marina Sena',
          descricao: 'Cantora e compositora brasileira.',
          fotoPerfilUrl: null
        },
        {
          idArtista: 6,
          nome: 'Liniker',
          nomeCompleto: 'Liniker de Barros Ferreira Campos',
          descricao: 'Cantora e compositora brasileira.',
          fotoPerfilUrl: null
        }
      ])),
      listarAlbuns: vi.fn().mockReturnValue(of([
        {
          idAlbum: 20,
          titulo: 'De Primeira',
          anoLancamento: 2021,
          capaUrl: null,
          artista: {
            id: 5,
            nome: 'Marina Sena',
            nomeCompleto: 'Marina Sena',
            descricao: 'Cantora e compositora brasileira.',
            fotoPerfilUrl: null
          }
        }
      ]))
    };

    reviewServiceMock = {
      listarMinhas: vi.fn().mockReturnValue(of(paginaReviews([])))
    };
    playlistServiceMock = {
      listarMinhas: vi.fn().mockReturnValue(of([]))
    };
    historicoServiceMock = {
      listar: vi.fn().mockReturnValue(of(paginaHistorico([])))
    };

    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideRouter([]),
        { provide: PerfilService, useValue: perfilServiceMock },
        { provide: CatalogoService, useValue: catalogoServiceMock },
        { provide: MusicaService, useValue: musicaServiceMock },
        { provide: ReviewService, useValue: reviewServiceMock },
        { provide: PlaylistService, useValue: playlistServiceMock },
        { provide: HistoricoService, useValue: historicoServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Perfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('deve exibir o nome sem revelar o email', () => {
    expect(fixture.nativeElement.textContent).toContain('Ana Liz Novaes');
    expect(fixture.nativeElement.textContent).not.toContain('@example');
  });

  it('deve usar o ícone existente e ocultar rótulo e nota quando há banner', () => {
    const marca = fixture.nativeElement.querySelector('.marca img');

    expect(marca.getAttribute('src')).toBe('/favicon.svg');
    expect(fixture.nativeElement.querySelector('.tipo-perfil')).toBeNull();
    expect(fixture.nativeElement.querySelector('.banner-nota')).toBeNull();
  });

  it('deve mostrar a nota do banner somente quando não há imagem escolhida', () => {
    component.perfil.set({ ...perfil, bannerUrl: null });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.banner-nota')).not.toBeNull();
  });

  it('deve colocar a escolha principal no cartão de destaque', () => {
    expect(component.destaquePrincipal()?.titulo).toBe('Por Supuesto');
    expect(component.gruposFavoritos()[0].itens[0].titulo)
      .toBe('Marina Sena');
    expect(fixture.nativeElement.querySelector('.contador')).toBeNull();
  });

  it('deve abrir o editor preenchido com os dados atuais', () => {
    component.abrirEdicao();
    fixture.detectChanges();

    expect(component.editando()).toBe(true);
    expect(component.formulario.controls.username.value).toBe('analiz');
    expect(component.formulario.controls.fotoUrl.value)
      .toBe('https://exemplo.com/foto.jpg');
    expect(fixture.nativeElement.querySelector('.editor').tagName)
      .toBe('DIALOG');
  });

  it('deve carregar e exibir os artistas no seletor de favoritos', () => {
    component.abrirEdicao();
    fixture.detectChanges();

    const opcoes = fixture.nativeElement.querySelectorAll(
      '#favoritos-artistas ~ .opcoes-favoritos .opcao-favorito'
    );

    expect(catalogoServiceMock.listarArtistas).toHaveBeenCalledOnce();
    expect(opcoes).toHaveLength(2);
    expect(opcoes[0].textContent).toContain('Marina Sena');
    expect(opcoes[1].textContent).toContain('Liniker');
    expect(opcoes[0].querySelector('input').type).toBe('checkbox');
  });

  it('deve abrir o editor quando a API omite coleções vazias', () => {
    component.perfil.set({
      nome: 'Perfil novo',
      role: 'USER'
    } as PerfilResponse);

    expect(() => component.abrirEdicao()).not.toThrow();
    fixture.detectChanges();

    expect(component.editando()).toBe(true);
    expect(component.formulario.controls.idsArtistasFavoritos.value)
      .toEqual([]);
    expect(component.formulario.controls.idsAlbunsFavoritos.value)
      .toEqual([]);
    expect(component.formulario.controls.idsMusicasFavoritas.value)
      .toEqual([]);
    expect(catalogoServiceMock.listarArtistas).toHaveBeenCalledOnce();
  });

  it('deve fechar o editor pela tecla Escape', () => {
    component.abrirEdicao();
    fixture.detectChanges();

    const editor = fixture.nativeElement.querySelector('.editor');
    editor.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true
    }));

    expect(component.editando()).toBe(false);
  });

  it('deve impedir link de imagem sem protocolo http', () => {
    component.formulario.controls.fotoUrl.setValue('exemplo.com/foto.jpg');
    expect(component.formulario.controls.fotoUrl.hasError('urlHttp')).toBe(true);
  });

  it('deve manter o destaque principal fora da lista de favoritos', () => {
    component.abrirEdicao();
    component.formulario.patchValue({
      tipoDestaquePrincipal: 'ARTISTA',
      idArtistaDestaque: 5,
      idsArtistasFavoritos: [5]
    });

    component.aoAlterarDestaque();

    expect(component.formulario.controls.idsArtistasFavoritos.value)
      .toEqual([]);
  });

  it('deve pesquisar músicas no backend e carregar as próximas páginas', () => {
    const primeira = musicaFavorita();
    const segunda = { ...musicaFavorita(), id: 11, titulo: 'Love of My Life' };

    musicaServiceMock.pesquisar
      .mockReturnValueOnce(of(paginaMusicas([primeira], 0, 2, 2)))
      .mockReturnValueOnce(of(paginaMusicas([segunda], 0, 2, 2)))
      .mockReturnValueOnce(of(paginaMusicas([
        { ...musicaFavorita(), id: 12, titulo: 'Somebody to Love' }
      ], 1, 2, 2)));

    component.abrirEdicao();
    component.atualizarBuscaMusica({
      currentTarget: { value: 'Love' }
    } as unknown as Event);
    component.pesquisarMusicas();
    component.carregarMaisMusicas();

    expect(musicaServiceMock.pesquisar).toHaveBeenNthCalledWith(
      2,
      { titulo: 'Love' },
      0,
      25,
      'titulo,asc'
    );
    expect(musicaServiceMock.pesquisar).toHaveBeenNthCalledWith(
      3,
      { titulo: 'Love' },
      1,
      25,
      'titulo,asc'
    );
    expect(component.musicas().map(musica => musica.id))
      .toEqual([10, 11, 12]);
  });

  it('deve salvar o perfil sem enviar strings opcionais vazias', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    component.abrirEdicao();
    component.formulario.patchValue({
      nome: 'Ana',
      username: '',
      fotoUrl: '',
      bannerUrl: '',
      tipoDestaquePrincipal: 'MUSICA'
    });

    component.salvar();

    expect(perfilServiceMock.atualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Ana',
        username: null,
        fotoUrl: null,
        bannerUrl: null,
        idMusicaDestaque: 10,
        tipoDestaquePrincipal: 'MUSICA',
        idsArtistasFavoritos: [5],
        idsAlbunsFavoritos: [],
        idsMusicasFavoritas: []
      })
    );
    expect(component.editando()).toBe(false);
  });

  function musicaFavorita(): MusicaListagem {
    return {
      id: 10,
      titulo: 'Por Supuesto',
      duracaoSegundos: 180,
      anoLancamento: 2021,
      artistaPrincipal: { id: 5, nome: 'Marina Sena' },
      album: null,
      artistasParticipantes: [],
      generos: [],
      curtida: false
    };
  }

  function paginaMusicas(
    itens: MusicaListagem[],
    paginaAtual = 0,
    totalPaginas = 1,
    totalItens = itens.length
  ): PaginaResponse<MusicaListagem> {
    return {
      itens,
      paginaAtual,
      tamanhoPagina: 25,
      totalItens,
      totalPaginas
    };
  }

  function paginaReviews(itens: Review[]): PaginaResponse<Review> {
    return {
      itens,
      paginaAtual: 0,
      tamanhoPagina: 5,
      totalItens: itens.length,
      totalPaginas: 1
    };
  }

  function paginaHistorico(itens: HistoricoItem[]): PaginaResponse<HistoricoItem> {
    return {
      itens,
      paginaAtual: 0,
      tamanhoPagina: 10,
      totalItens: itens.length,
      totalPaginas: 1
    };
  }

  function playlistDeExemplo(): PlaylistResponse {
    return {
      id: 1,
      nome: 'Favoritas',
      descricao: '',
      capaUrl: null,
      musicas: [{ id: 10, titulo: 'Por Supuesto', artista: 'Marina Sena', capaUrl: null }],
      especial: false
    };
  }

  it('deve exibir as estatísticas de reviews do perfil', () => {
    const estatisticas = fixture.nativeElement.querySelectorAll(
      '.estatisticas-reviews dd'
    );

    expect(estatisticas[0].textContent.trim()).toBe('4');
    expect(estatisticas[1].textContent.trim()).toBe('1');
  });

  it('deve exibir as reviews recentes do perfil', () => {
    reviewServiceMock.listarMinhas.mockReturnValue(of(paginaReviews([{
      idReview: 3,
      autor: { id: 1, nome: 'Ana Liz Novaes' },
      alvo: { tipo: 'MUSICA', id: 10, titulo: 'Por Supuesto', artista: 'Marina Sena', capaUrl: null },
      nota: 5,
      texto: null,
      criadaEm: '2026-01-01T00:00:00Z',
      atualizadaEm: '2026-01-01T00:00:00Z',
      minhaReview: true
    }])));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    const cartoes = fixture.nativeElement.querySelectorAll(
      '.reviews-lista-horizontal .review-card'
    );
    expect(cartoes).toHaveLength(1);
  });

  it('deve exibir mensagem de estado vazio quando não há reviews', () => {
    expect(fixture.nativeElement.querySelector('.reviews-recentes-area').textContent)
      .toContain('ainda não fez nenhuma review');
  });

  it('deve exibir as playlists do usuário', () => {
    playlistServiceMock.listarMinhas.mockReturnValue(of([playlistDeExemplo()]));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    const cartoes = fixture.nativeElement.querySelectorAll('.playlist-card');
    expect(cartoes).toHaveLength(1);
    expect(cartoes[0].textContent).toContain('Favoritas');
  });

  it('deve exibir mensagem de estado vazio quando não há playlists', () => {
    expect(fixture.nativeElement.querySelector('.playlists-area').textContent)
      .toContain('ainda não criou nenhuma playlist');
  });

  it('deve exibir mensagem de erro quando o perfil falha ao carregar', () => {
    perfilServiceMock.obter.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        error: { message: 'Falha ao carregar perfil.' }
      }))
    );

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    expect(fixture.componentInstance.mensagemErro()).toBe('Falha ao carregar perfil.');
    expect(fixture.componentInstance.carregando()).toBe(false);
  });

  it('deve manter as reviews vazias quando a busca falha', () => {
    reviewServiceMock.listarMinhas.mockReturnValue(throwError(() => new Error('erro')));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    expect(fixture.componentInstance.reviewsRecentes()).toEqual([]);
  });

  it('deve manter as playlists vazias quando a busca falha', () => {
    playlistServiceMock.listarMinhas.mockReturnValue(throwError(() => new Error('erro')));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    expect(fixture.componentInstance.playlists()).toEqual([]);
  });

  it('deve exibir as músicas visualizadas recentemente', () => {
    historicoServiceMock.listar.mockReturnValue(of(paginaHistorico([{
      idHistorico: 1,
      musica: { id: 10, titulo: 'Por Supuesto', artista: 'Marina Sena', capaUrl: null },
      visualizadoEm: '2026-01-01T00:00:00Z'
    }])));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    const cartoes = fixture.nativeElement.querySelectorAll(
      '.historico-lista-horizontal .historico-card'
    );
    expect(cartoes).toHaveLength(1);
    expect(cartoes[0].textContent).toContain('Por Supuesto');
  });

  it('deve exibir mensagem de estado vazio quando não há histórico', () => {
    expect(fixture.nativeElement.querySelector('.historico-area').textContent)
      .toContain('ainda não visualizou nenhuma música');
  });

  it('deve manter o histórico vazio quando a busca falha', () => {
    historicoServiceMock.listar.mockReturnValue(throwError(() => new Error('erro')));

    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();

    expect(fixture.componentInstance.historico()).toEqual([]);
  });

  it('deve exibir mensagem de erro quando o catálogo falha ao carregar', () => {
    catalogoServiceMock.listarArtistas.mockReturnValue(throwError(() => new Error('erro')));

    component.abrirEdicao();

    expect(component.mensagemErro()).toBe(
      'Não foi possível carregar o catálogo para escolher os favoritos.'
    );
    expect(component.catalogoCarregando()).toBe(false);
  });

  it('deve ignorar músicas selecionadas que falham ao carregar', () => {
    musicaServiceMock.buscarPorId.mockReturnValue(throwError(() => new Error('erro')));

    expect(() => component.abrirEdicao()).not.toThrow();
  });

  it('não deve salvar quando o formulário é inválido', () => {
    component.formulario.controls.nome.setValue('');

    component.salvar();

    expect(component.formulario.touched).toBe(true);
    expect(perfilServiceMock.atualizar).not.toHaveBeenCalled();
  });

  it('não deve salvar quando o destaque principal não possui item selecionado', () => {
    component.abrirEdicao();
    component.formulario.patchValue({
      tipoDestaquePrincipal: 'ARTISTA',
      idArtistaDestaque: null
    });

    component.salvar();

    expect(component.mensagemErro()).toBe(
      'Escolha um item válido para o destaque principal.'
    );
    expect(perfilServiceMock.atualizar).not.toHaveBeenCalled();
  });

  it('deve permitir salvar sem destaque principal selecionado', () => {
    component.abrirEdicao();
    component.formulario.patchValue({
      tipoDestaquePrincipal: null,
      idArtistaDestaque: null,
      idMusicaDestaque: null,
      idAlbumDestaque: null
    });

    component.salvar();

    expect(perfilServiceMock.atualizar).toHaveBeenCalled();
    expect(component.mensagemErro()).toBe('');
  });

  it('deve exibir a mensagem de erro do backend quando salvar falha', () => {
    perfilServiceMock.atualizar.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        error: { message: 'Esse username já está em uso.' }
      }))
    );
    component.abrirEdicao();

    component.salvar();

    expect(component.mensagemErro()).toBe('Esse username já está em uso.');
    expect(component.salvando()).toBe(false);
  });

  it('deve exibir mensagem padrão quando salvar falha sem detalhes do backend', () => {
    perfilServiceMock.atualizar.mockReturnValue(throwError(() => new Error('falha de rede')));
    component.abrirEdicao();

    component.salvar();

    expect(component.mensagemErro()).toBe(
      'Não foi possível carregar ou atualizar o perfil.'
    );
  });

  it('deve montar a rota de cada tipo de item', () => {
    expect(component.rotaItem({
      tipo: 'ARTISTA', id: 5, titulo: '', subtitulo: '', imagemUrl: null
    })).toEqual(['/', 'artistas', '5']);
    expect(component.rotaItem({
      tipo: 'MUSICA', id: 10, titulo: '', subtitulo: '', imagemUrl: null
    })).toEqual(['/', 'musicas', '10']);
    expect(component.rotaItem({
      tipo: 'ALBUM', id: 20, titulo: '', subtitulo: '', imagemUrl: null
    })).toEqual(['/', 'albuns', '20']);
  });

  it('deve rotular cada tipo de destaque', () => {
    expect(component.rotuloTipo('ARTISTA')).toBe('Artista em destaque');
    expect(component.rotuloTipo('MUSICA')).toBe('Música em destaque');
    expect(component.rotuloTipo('ALBUM')).toBe('Álbum em destaque');
  });

  it('deve escolher a imagem alternativa correta por tipo', () => {
    expect(component.imagemAlternativa('ARTISTA')).toBe('/avatar-artista.png');
    expect(component.imagemAlternativa('MUSICA')).toBe('/capa-padrao.png');
    expect(component.imagemAlternativa('ALBUM')).toBe('/capa-padrao.png');
  });

  it('deve corrigir a imagem quebrada apenas uma vez', () => {
    const imagem = document.createElement('img');
    imagem.src = 'https://exemplo.com/quebrada.jpg';
    const evento = { currentTarget: imagem } as unknown as Event;

    component.corrigirImagem(evento, '/avatar-padrao.svg');
    expect(imagem.src).toContain('/avatar-padrao.svg');

    const srcAposCorrecao = imagem.src;
    component.corrigirImagem(evento, '/avatar-padrao.svg');
    expect(imagem.src).toBe(srcAposCorrecao);
  });

  it('deve fechar o editor diretamente', () => {
    component.abrirEdicao();
    component.fecharEdicao();
    expect(component.editando()).toBe(false);
  });

  it('deve atualizar os termos de busca de artista e álbum', () => {
    component.atualizarBuscaArtista(
      { currentTarget: { value: 'Marina' } } as unknown as Event
    );
    component.atualizarBuscaAlbum(
      { currentTarget: { value: 'De Primeira' } } as unknown as Event
    );

    expect(component.buscaArtista()).toBe('Marina');
    expect(component.buscaAlbum()).toBe('De Primeira');
  });

  it('deve filtrar artistas e álbuns pelo termo pesquisado', () => {
    component.abrirEdicao();

    component.atualizarBuscaArtista(
      { currentTarget: { value: 'liniker' } } as unknown as Event
    );
    expect(component.artistasFiltrados().map(item => item.nome)).toEqual(['Liniker']);

    component.atualizarBuscaAlbum(
      { currentTarget: { value: 'primeira' } } as unknown as Event
    );
    expect(component.albunsFiltrados().map(item => item.titulo)).toEqual(['De Primeira']);
  });

  it('deve verificar se um item está selecionado como favorito', () => {
    component.abrirEdicao();

    expect(component.estaSelecionado('idsArtistasFavoritos', 5)).toBe(true);
    expect(component.estaSelecionado('idsArtistasFavoritos', 99)).toBe(false);
  });

  it('deve verificar se um item é o destaque principal', () => {
    component.abrirEdicao();

    expect(component.itemEhDestaque('MUSICA', 10)).toBe(true);
    expect(component.itemEhDestaque('ARTISTA', 10)).toBe(false);
  });

  it('deve indicar quando o limite de favoritos foi atingido', () => {
    component.abrirEdicao();
    component.formulario.controls.idsArtistasFavoritos.setValue([1, 2, 3]);

    expect(component.limiteAtingido('idsArtistasFavoritos', 4)).toBe(true);
    expect(component.limiteAtingido('idsArtistasFavoritos', 1)).toBe(false);
  });

  function eventoCheckbox(marcado: boolean): Event {
    return { currentTarget: { checked: marcado } } as unknown as Event;
  }

  it('deve remover um favorito ao desmarcar o checkbox', () => {
    component.abrirEdicao();

    component.alternarFavorito('idsArtistasFavoritos', 'ARTISTA', 5, eventoCheckbox(false));

    expect(component.formulario.controls.idsArtistasFavoritos.value).toEqual([]);
  });

  it('não deve permitir marcar um item que já é o destaque principal', () => {
    component.abrirEdicao();
    component.formulario.patchValue({
      tipoDestaquePrincipal: 'ARTISTA',
      idArtistaDestaque: 5
    });

    component.alternarFavorito('idsArtistasFavoritos', 'ARTISTA', 5, eventoCheckbox(true));

    expect(component.mensagemErro()).toBe(
      'O destaque principal não pode ser repetido nos favoritos.'
    );
  });

  it('deve impedir selecionar mais de três favoritos por categoria', () => {
    component.abrirEdicao();
    component.formulario.controls.idsArtistasFavoritos.setValue([1, 2, 3]);

    component.alternarFavorito('idsArtistasFavoritos', 'ARTISTA', 4, eventoCheckbox(true));

    expect(component.mensagemErro()).toBe('Escolha no máximo três itens por categoria.');
    expect(component.formulario.controls.idsArtistasFavoritos.value).toEqual([1, 2, 3]);
  });

  it('deve adicionar um favorito ao marcar o checkbox', () => {
    component.abrirEdicao();

    component.alternarFavorito('idsArtistasFavoritos', 'ARTISTA', 9, eventoCheckbox(true));

    expect(component.formulario.controls.idsArtistasFavoritos.value).toContain(9);
    expect(component.mensagemErro()).toBe('');
  });

  it('deve exibir mensagem de erro quando a pesquisa de músicas falha', () => {
    musicaServiceMock.pesquisar.mockReturnValue(throwError(() => new Error('erro')));

    component.abrirEdicao();

    expect(component.mensagemErroMusicas()).toBe(
      'Não foi possível pesquisar as músicas. Tente novamente.'
    );
  });

  it('não deve carregar mais músicas quando não há mais páginas', () => {
    component.abrirEdicao();
    musicaServiceMock.pesquisar.mockClear();

    component.carregarMaisMusicas();

    expect(musicaServiceMock.pesquisar).not.toHaveBeenCalled();
  });

  it('não deve carregar mais músicas enquanto uma busca está em andamento', () => {
    const pendente = new Subject<PaginaResponse<MusicaListagem>>();
    musicaServiceMock.pesquisar
      .mockReturnValueOnce(of(paginaMusicas([musicaFavorita()], 0, 3, 3)))
      .mockReturnValueOnce(pendente.asObservable());

    component.abrirEdicao();
    component.pesquisarMusicas();
    component.carregarMaisMusicas();

    expect(musicaServiceMock.pesquisar).toHaveBeenCalledTimes(2);

    pendente.next(paginaMusicas([musicaFavorita()], 1, 3, 3));
    pendente.complete();
  });
});
