import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { HistoricoItem } from '../../../models/HistoricoItem';
import type { PerfilResponse } from '../../../models/Perfil';
import type { PlaylistResponse } from '../../../models/PlaylistResponse';
import type { Review } from '../../../models/Review';
import { ReviewCard } from '../../../shared/review-card/review-card';
import { PlaylistCard } from '../../../shared/playlist-card/playlist-card';

@Component({
  selector: 'app-perfil-atividade',
  imports: [RouterLink, ReviewCard, PlaylistCard],
  templateUrl: './perfil-atividade.html',
  styleUrls: ['./perfil-atividade.css']
})
export class PerfilAtividade {

  readonly perfil = input.required<PerfilResponse>();
  readonly reviewsRecentes = input.required<Review[]>();
  readonly playlists = input.required<PlaylistResponse[]>();
  readonly historico = input.required<HistoricoItem[]>();

  aoFalharCapa(evento: Event): void {
    const imagem = evento.target as HTMLImageElement;
    imagem.src = '/capa-padrao.png';
  }
}
