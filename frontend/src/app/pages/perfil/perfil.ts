import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  signal,
  viewChild
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

import type { AlbumResponse } from '../../models/AlbumResponse';
import type { ArtistaResponse } from '../../models/ArtistaResponse';
import type { HistoricoItem } from '../../models/HistoricoItem';
import type { MusicaListagem } from '../../models/MusicaListagem';
import type {
  AtualizarPerfilRequest,
  PerfilItem,
  PerfilResponse,
  TipoDestaquePerfil
} from '../../models/Perfil';
import type { PlaylistResponse } from '../../models/PlaylistResponse';
import type { Review } from '../../models/Review';
import { CatalogoService } from '../../services/catalogo';
import { HistoricoService } from '../../services/historico';
import { MusicaService } from '../../services/musica';
import { PerfilService } from '../../services/perfil';
import { PlaylistService } from '../../services/playlist';
import { ReviewService } from '../../services/review';
import { PerfilAtividade } from './perfil-atividade/perfil-atividade';

const TAMANHO_REVIEWS_RECENTES = 5;
const TAMANHO_HISTORICO_RECENTE = 10;

type CampoFavoritos =
  | 'idsArtistasFavoritos'
  | 'idsAlbunsFavoritos'
  | 'idsMusicasFavoritas';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, PerfilAtividade],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class Perfil implements OnInit {

  private readonly editorDialog =
    viewChild<ElementRef<HTMLDialogElement>>('editorDialog');

  readonly perfil = signal<PerfilResponse | null>(null);
  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly editando = signal(false);
  readonly catalogoCarregando = signal(false);
  readonly musicasCarregando = signal(false);
  readonly mensagemErro = signal('');
  readonly mensagemSucesso = signal('');
  readonly mensagemErroMusicas = signal('');

  readonly reviewsRecentes = signal<Review[]>([]);
  readonly playlists = signal<PlaylistResponse[]>([]);
  readonly historico = signal<HistoricoItem[]>([]);

  readonly artistas = signal<ArtistaResponse[]>([]);
  readonly musicas = signal<MusicaListagem[]>([]);
  readonly albuns = signal<AlbumResponse[]>([]);
  readonly buscaMusica = signal('');
  readonly buscaArtista = signal('');
  readonly buscaAlbum = signal('');
  readonly paginaMusicas = signal(0);
  readonly totalPaginasMusicas = signal(0);
  readonly totalMusicas = signal(0);

  readonly podeCarregarMaisMusicas = computed(
    () => this.paginaMusicas() + 1 < this.totalPaginasMusicas()
  );

  readonly artistasFiltrados = computed(() => {
    const termo = this.normalizarBusca(this.buscaArtista());
    if (!termo) return this.artistas();

    return this.artistas().filter(
      artista => this.normalizarBusca(artista.nome).includes(termo)
    );
  });

  readonly albunsFiltrados = computed(() => {
    const termo = this.normalizarBusca(this.buscaAlbum());
    if (!termo) return this.albuns();

    return this.albuns().filter(
      album =>
        this.normalizarBusca(album.titulo).includes(termo) ||
        this.normalizarBusca(album.artista.nome).includes(termo)
    );
  });

  readonly destaquePrincipal = computed<PerfilItem | null>(() => {
    const perfil = this.perfil();
    if (!perfil) return null;

    return {
      ARTISTA: perfil.artistaDestaque,
      MUSICA: perfil.musicaDestaque,
      ALBUM: perfil.albumDestaque
    }[perfil.tipoDestaquePrincipal ?? 'ARTISTA'] ?? null;
  });

  readonly gruposFavoritos = computed(() => {
    const perfil = this.perfil();
    return [
      {
        tipo: 'ARTISTA' as const,
        titulo: 'Artistas',
        itens: perfil?.artistasFavoritos ?? []
      },
      {
        tipo: 'ALBUM' as const,
        titulo: 'Álbuns',
        itens: perfil?.albunsFavoritos ?? []
      },
      {
        tipo: 'MUSICA' as const,
        titulo: 'Músicas',
        itens: perfil?.musicasFavoritas ?? []
      }
    ];
  });

  readonly formulario = new FormGroup({
    nome: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)]
    }),
    username: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[A-Za-z0-9._]*$/)
      ]
    }),
    fotoUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2048), this.validarUrlHttp]
    }),
    bannerUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(2048), this.validarUrlHttp]
    }),
    biografia: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(800)]
    }),
    fraseDestaque: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(160)]
    }),
    idArtistaDestaque: new FormControl<number | null>(null),
    idMusicaDestaque: new FormControl<number | null>(null),
    idAlbumDestaque: new FormControl<number | null>(null),
    tipoDestaquePrincipal: new FormControl<TipoDestaquePerfil | null>(null),
    idsArtistasFavoritos: new FormControl<number[]>([], { nonNullable: true }),
    idsAlbunsFavoritos: new FormControl<number[]>([], { nonNullable: true }),
    idsMusicasFavoritas: new FormControl<number[]>([], { nonNullable: true })
  });

  constructor(
    private readonly perfilService: PerfilService,
    private readonly catalogoService: CatalogoService,
    private readonly musicaService: MusicaService,
    private readonly reviewService: ReviewService,
    private readonly playlistService: PlaylistService,
    private readonly historicoService: HistoricoService
  ) {
    effect(() => {
      const dialog = this.editorDialog()?.nativeElement;
      if (!dialog || dialog.open) return;

      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    });
  }

  ngOnInit(): void {
    this.carregarPerfil();
    this.carregarReviewsRecentes();
    this.carregarPlaylists();
    this.carregarHistorico();
  }

  abrirEdicao(): void {
    const perfil = this.perfil();
    if (!perfil) return;

    this.preencherFormulario(perfil);
    this.editando.set(true);
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    if (this.artistas().length === 0 || this.albuns().length === 0) {
      this.carregarCatalogo();
    }

    if (this.musicas().length === 0) {
      this.carregarPaginaMusicas(false, 0);
    }
  }

  fecharEdicao(): void {
    this.editando.set(false);
    this.mensagemErro.set('');
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dados = this.montarRequest();
    if (!this.destaquePrincipalValido(dados)) {
      this.mensagemErro.set(
        'Escolha um item válido para o destaque principal.'
      );
      return;
    }

    this.salvando.set(true);
    this.mensagemErro.set('');

    this.perfilService.atualizar(dados).subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.salvando.set(false);
        this.editando.set(false);
        this.mensagemSucesso.set('Perfil atualizado com sucesso.');

        if (typeof window !== 'undefined') {
          localStorage.setItem('nome', perfil.nome);
        }
      },
      error: erro => {
        this.salvando.set(false);
        this.mensagemErro.set(this.extrairMensagemErro(erro));
      }
    });
  }

  rotaItem(item: PerfilItem): string[] {
    const segmento = {
      ARTISTA: 'artistas',
      MUSICA: 'musicas',
      ALBUM: 'albuns'
    }[item.tipo];

    return ['/', segmento, String(item.id)];
  }

  rotuloTipo(tipo: TipoDestaquePerfil): string {
    return {
      ARTISTA: 'Artista em destaque',
      MUSICA: 'Música em destaque',
      ALBUM: 'Álbum em destaque'
    }[tipo];
  }

  imagemAlternativa(tipo: TipoDestaquePerfil): string {
    return tipo === 'ARTISTA' ? '/avatar-artista.png' : '/capa-padrao.png';
  }

  corrigirImagem(evento: Event, fallback: string): void {
    const imagem = evento.currentTarget as HTMLImageElement;
    if (!imagem.src.endsWith(fallback)) {
      imagem.src = fallback;
    }
  }

  atualizarBuscaMusica(evento: Event): void {
    const campo = evento.currentTarget as HTMLInputElement;
    this.buscaMusica.set(campo.value);
  }

  atualizarBuscaArtista(evento: Event): void {
    const campo = evento.currentTarget as HTMLInputElement;
    this.buscaArtista.set(campo.value);
  }

  atualizarBuscaAlbum(evento: Event): void {
    const campo = evento.currentTarget as HTMLInputElement;
    this.buscaAlbum.set(campo.value);
  }

  pesquisarMusicas(): void {
    this.carregarPaginaMusicas(false, 0);
  }

  carregarMaisMusicas(): void {
    if (this.musicasCarregando() || !this.podeCarregarMaisMusicas()) return;

    this.carregarPaginaMusicas(true, this.paginaMusicas() + 1);
  }

  aoAlterarDestaque(): void {
    const tipo = this.formulario.controls.tipoDestaquePrincipal.value;
    const configuracao = tipo ? this.configuracaoCategoria(tipo) : null;
    if (!configuracao) return;

    const id = this.formulario.controls[configuracao.campoDestaque].value;
    if (id !== null) {
      this.removerFavorito(configuracao.campoFavoritos, id);
    }
  }

  estaSelecionado(campo: CampoFavoritos, id: number): boolean {
    return this.formulario.controls[campo].value.includes(id);
  }

  itemEhDestaque(tipo: TipoDestaquePerfil, id: number): boolean {
    if (this.formulario.controls.tipoDestaquePrincipal.value !== tipo) {
      return false;
    }

    const configuracao = this.configuracaoCategoria(tipo);
    return this.formulario.controls[configuracao.campoDestaque].value === id;
  }

  limiteAtingido(campo: CampoFavoritos, id: number): boolean {
    const selecionados = this.formulario.controls[campo].value;
    return selecionados.length >= 3 && !selecionados.includes(id);
  }

  alternarFavorito(
    campo: CampoFavoritos,
    tipo: TipoDestaquePerfil,
    id: number,
    evento: Event
  ): void {
    const marcado = (evento.currentTarget as HTMLInputElement).checked;
    const selecionados = this.formulario.controls[campo].value;

    if (!marcado) {
      this.formulario.controls[campo].setValue(
        selecionados.filter(itemId => itemId !== id)
      );
      return;
    }

    if (this.itemEhDestaque(tipo, id)) {
      this.mensagemErro.set(
        'O destaque principal não pode ser repetido nos favoritos.'
      );
      return;
    }

    if (selecionados.length >= 3) {
      this.mensagemErro.set('Escolha no máximo três itens por categoria.');
      return;
    }

    this.mensagemErro.set('');
    this.formulario.controls[campo].setValue([...selecionados, id]);
  }

  private carregarPerfil(): void {
    this.perfilService.obter().subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.carregando.set(false);
      },
      error: erro => {
        this.carregando.set(false);
        this.mensagemErro.set(this.extrairMensagemErro(erro));
      }
    });
  }

  private carregarReviewsRecentes(): void {
    this.reviewService.listarMinhas(0, TAMANHO_REVIEWS_RECENTES).subscribe({
      next: pagina => this.reviewsRecentes.set(pagina.itens),
      error: () => this.reviewsRecentes.set([])
    });
  }

  private carregarPlaylists(): void {
    this.playlistService.listarMinhas().subscribe({
      next: playlists => this.playlists.set(playlists),
      error: () => this.playlists.set([])
    });
  }

  private carregarHistorico(): void {
    this.historicoService.listar(0, TAMANHO_HISTORICO_RECENTE).subscribe({
      next: pagina => this.historico.set(pagina.itens),
      error: () => this.historico.set([])
    });
  }

  private carregarCatalogo(): void {
    this.catalogoCarregando.set(true);

    forkJoin({
      artistas: this.catalogoService.listarArtistas(),
      albuns: this.catalogoService.listarAlbuns()
    }).subscribe({
      next: catalogo => {
        this.artistas.set(catalogo.artistas);
        this.albuns.set(catalogo.albuns);
        this.catalogoCarregando.set(false);
      },
      error: () => {
        this.catalogoCarregando.set(false);
        this.mensagemErro.set(
          'Não foi possível carregar o catálogo para escolher os favoritos.'
        );
      }
    });
  }

  private carregarPaginaMusicas(
    acumular: boolean,
    paginaSolicitada: number
  ): void {
    if (this.musicasCarregando()) return;

    const termo = this.buscaMusica().trim();
    const idsSelecionados = new Set([
      this.formulario.controls.idMusicaDestaque.value,
      ...this.formulario.controls.idsMusicasFavoritas.value
    ].filter((id): id is number => id !== null));
    const idsCarregados = new Set(this.musicas().map(musica => musica.id));
    const idsAusentes = [...idsSelecionados].filter(id => !idsCarregados.has(id));
    const musicasSelecionadas$ = idsAusentes.length === 0
      ? of([] as MusicaListagem[])
      : forkJoin(idsAusentes.map(id => this.musicaService.buscarPorId(id).pipe(
          catchError(() => of(null))
        ))).pipe(
          map(itens => itens
            .filter(item => item !== null)
            .map((item): MusicaListagem => ({ ...item, curtida: false }))
          )
        );

    this.musicasCarregando.set(true);
    this.mensagemErroMusicas.set('');

    forkJoin({
      pagina: this.musicaService.pesquisar(
        termo ? { titulo: termo } : {},
        paginaSolicitada,
        25,
        'titulo,asc'
      ),
      selecionadas: musicasSelecionadas$
    }).pipe(
      finalize(() => this.musicasCarregando.set(false))
    ).subscribe({
      next: ({ pagina, selecionadas }) => {
        const itens = acumular
          ? [...this.musicas(), ...pagina.itens]
          : pagina.itens;

        this.musicas.set(this.removerMusicasDuplicadas(selecionadas, itens));
        this.paginaMusicas.set(pagina.paginaAtual);
        this.totalPaginasMusicas.set(pagina.totalPaginas);
        this.totalMusicas.set(pagina.totalItens);
      },
      error: () => {
        this.mensagemErroMusicas.set(
          'Não foi possível pesquisar as músicas. Tente novamente.'
        );
      }
    });
  }

  private removerMusicasDuplicadas(
    selecionadas: MusicaListagem[],
    musicas: MusicaListagem[]
  ): MusicaListagem[] {
    const unicas = new Map<number, MusicaListagem>();

    selecionadas.forEach(musica => unicas.set(musica.id, musica));
    musicas.forEach(musica => unicas.set(musica.id, musica));

    return [...unicas.values()];
  }

  private preencherFormulario(perfil: PerfilResponse): void {
    this.formulario.reset({
      nome: perfil.nome,
      username: perfil.username ?? '',
      fotoUrl: perfil.fotoUrl ?? '',
      bannerUrl: perfil.bannerUrl ?? '',
      biografia: perfil.biografia ?? '',
      fraseDestaque: perfil.fraseDestaque ?? '',
      idArtistaDestaque: perfil.artistaDestaque?.id ?? null,
      idMusicaDestaque: perfil.musicaDestaque?.id ?? null,
      idAlbumDestaque: perfil.albumDestaque?.id ?? null,
      tipoDestaquePrincipal: perfil.tipoDestaquePrincipal ?? null,
      idsArtistasFavoritos: (perfil.artistasFavoritos ?? [])
        .map(item => item.id),
      idsAlbunsFavoritos: (perfil.albunsFavoritos ?? [])
        .map(item => item.id),
      idsMusicasFavoritas: (perfil.musicasFavoritas ?? [])
        .map(item => item.id)
    });
  }

  private montarRequest(): AtualizarPerfilRequest {
    const valor = this.formulario.getRawValue();
    return {
      nome: valor.nome.trim(),
      username: this.normalizarOpcional(valor.username),
      fotoUrl: this.normalizarOpcional(valor.fotoUrl),
      bannerUrl: this.normalizarOpcional(valor.bannerUrl),
      biografia: this.normalizarOpcional(valor.biografia),
      fraseDestaque: this.normalizarOpcional(valor.fraseDestaque),
      idArtistaDestaque: valor.tipoDestaquePrincipal === 'ARTISTA'
        ? valor.idArtistaDestaque : null,
      idMusicaDestaque: valor.tipoDestaquePrincipal === 'MUSICA'
        ? valor.idMusicaDestaque : null,
      idAlbumDestaque: valor.tipoDestaquePrincipal === 'ALBUM'
        ? valor.idAlbumDestaque : null,
      tipoDestaquePrincipal: valor.tipoDestaquePrincipal,
      idsArtistasFavoritos: valor.idsArtistasFavoritos,
      idsAlbunsFavoritos: valor.idsAlbunsFavoritos,
      idsMusicasFavoritas: valor.idsMusicasFavoritas
    };
  }

  private destaquePrincipalValido(dados: AtualizarPerfilRequest): boolean {
    if (dados.tipoDestaquePrincipal === null) return true;

    return {
      ARTISTA: dados.idArtistaDestaque !== null,
      MUSICA: dados.idMusicaDestaque !== null,
      ALBUM: dados.idAlbumDestaque !== null
    }[dados.tipoDestaquePrincipal];
  }

  private normalizarBusca(valor: string): string {
    return valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  private normalizarOpcional(valor: string): string | null {
    const normalizado = valor.trim();
    return normalizado.length > 0 ? normalizado : null;
  }

  private removerFavorito(campo: CampoFavoritos, id: number): void {
    const selecionados = this.formulario.controls[campo].value;
    this.formulario.controls[campo].setValue(
      selecionados.filter(itemId => itemId !== id)
    );
  }

  private configuracaoCategoria(tipo: TipoDestaquePerfil): {
    campoDestaque:
      | 'idArtistaDestaque'
      | 'idAlbumDestaque'
      | 'idMusicaDestaque';
    campoFavoritos: CampoFavoritos;
  } {
    const configuracoes: Record<TipoDestaquePerfil, {
      campoDestaque:
        | 'idArtistaDestaque'
        | 'idAlbumDestaque'
        | 'idMusicaDestaque';
      campoFavoritos: CampoFavoritos;
    }> = {
      ARTISTA: {
        campoDestaque: 'idArtistaDestaque',
        campoFavoritos: 'idsArtistasFavoritos'
      },
      ALBUM: {
        campoDestaque: 'idAlbumDestaque',
        campoFavoritos: 'idsAlbunsFavoritos'
      },
      MUSICA: {
        campoDestaque: 'idMusicaDestaque',
        campoFavoritos: 'idsMusicasFavoritas'
      }
    };

    return configuracoes[tipo];
  }

  private validarUrlHttp(control: AbstractControl): ValidationErrors | null {
    const valor = String(control.value ?? '').trim();
    if (valor === '' || /^https?:\/\//i.test(valor)) return null;
    return { urlHttp: true };
  }

  private extrairMensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      return erro.error?.message
        ?? 'Não foi possível carregar ou atualizar o perfil.';
    }
    return 'Não foi possível carregar ou atualizar o perfil.';
  }
}
