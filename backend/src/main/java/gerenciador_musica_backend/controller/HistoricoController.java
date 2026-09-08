package gerenciador_musica_backend.controller;

import gerenciador_musica_backend.dto.HistoricoItemDTO;
import gerenciador_musica_backend.dto.PaginaResponseDTO;
import gerenciador_musica_backend.service.HistoricoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Histórico de músicas acessadas pelo usuário autenticado (US16).
 */
@RestController
@RequestMapping("/api/historico")
public class HistoricoController {

    private final HistoricoService historicoService;

    public HistoricoController(HistoricoService historicoService) {
        this.historicoService = historicoService;
    }

    /**
     * GET /api/historico — músicas visualizadas pelo usuário autenticado,
     * da mais recente para a mais antiga.
     *
     * @param page número da página, começando em 0 (padrão: 0)
     * @param size itens por página (padrão: 20, máximo: 50)
     * @return 200 OK com PaginaResponseDTO&lt;HistoricoItemDTO&gt;, mesmo
     *         quando o histórico está vazio (lista de itens vazia)
     */
    @GetMapping
    public ResponseEntity<PaginaResponseDTO<HistoricoItemDTO>> listar(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ResponseEntity.ok(
                historicoService.listarHistorico(page, size)
        );
    }
}
