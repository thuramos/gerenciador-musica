package gerenciador_musica_backend.dto;

import java.time.OffsetDateTime;

public record HistoricoItemDTO(
        Long idHistorico,
        MusicaResumoDTO musica,
        OffsetDateTime visualizadoEm
) {
}
