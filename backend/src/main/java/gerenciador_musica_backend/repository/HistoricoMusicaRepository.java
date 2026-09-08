package gerenciador_musica_backend.repository;

import gerenciador_musica_backend.model.HistoricoMusica;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface HistoricoMusicaRepository
        extends JpaRepository<HistoricoMusica, Long> {

    /*
     * Última música vista pelo usuário, usada para não registrar uma
     * ocorrência repetida consecutiva da mesma música no histórico.
     */
    Optional<HistoricoMusica> findFirstByUsuario_IdOrderByVisualizadoEmDesc(
            Long usuarioId
    );

    Page<HistoricoMusica> findByUsuario_IdOrderByVisualizadoEmDesc(
            Long usuarioId,
            Pageable pageable
    );

    /*
     * Remove as ocorrências mais antigas do usuário além das `limite`
     * mais recentes, mantendo o histórico com tamanho limitado mesmo
     * após muitas visualizações.
     */
    @Modifying
    @Transactional
    @Query(value = """
            DELETE FROM historico_musica
            WHERE id_historico IN (
                SELECT id_historico
                FROM historico_musica
                WHERE id_usuario = :usuarioId
                ORDER BY visualizado_em DESC
                OFFSET :limite
            )
            """, nativeQuery = true)
    void removerExcedente(
            @Param("usuarioId") Long usuarioId,
            @Param("limite") int limite
    );
}
