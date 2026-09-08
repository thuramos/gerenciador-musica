package gerenciador_musica_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "historico_musica")
public class HistoricoMusica {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_historico")
    private Long idHistorico;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_musica", nullable = false)
    private Musica musica;

    @CreationTimestamp
    @Column(name = "visualizado_em", nullable = false, updatable = false)
    private OffsetDateTime visualizadoEm;

    protected HistoricoMusica() {
    }

    public HistoricoMusica(Usuario usuario, Musica musica) {
        this.usuario = usuario;
        this.musica = musica;
    }

    public Long getIdHistorico() {
        return idHistorico;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public Musica getMusica() {
        return musica;
    }

    public OffsetDateTime getVisualizadoEm() {
        return visualizadoEm;
    }
}
