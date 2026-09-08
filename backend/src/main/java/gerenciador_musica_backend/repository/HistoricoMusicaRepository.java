package gerenciador_musica_backend.repository;

import gerenciador_musica_backend.model.HistoricoMusica;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface HistoricoMusicaRepository
        extends JpaRepository<HistoricoMusica, Long> {

    /*
     * ID da última música vista pelo usuário, usado para não registrar
     * uma ocorrência repetida consecutiva da mesma música no histórico.
     * Retorna só o ID (e não a entidade HistoricoMusica) para não
     * deixar, na sessão do Hibernate, uma referência gerenciada à
     * música — o que causaria erro ao excluí-la logo em seguida, ainda
     * na mesma transação/sessão (ex.: nos testes de integração de
     * CRUD, que fazem GET e DELETE em sequência).
     */
    @Query("""
            SELECT h.musica.idMusica
            FROM HistoricoMusica h
            WHERE h.usuario.id = :usuarioId
            ORDER BY h.visualizadoEm DESC
            """)
    List<Long> buscarIdsDasUltimasMusicasVisualizadas(
            @Param("usuarioId") Long usuarioId,
            Pageable pageable
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
