// api/youtube.js
// Importa o módulo 'node-fetch' para fazer requisições HTTP no ambiente Node.js.
const fetch = require('node-fetch');

// Obtém a chave da API do YouTube das variáveis de ambiente do servidor (configurada na Vercel).
const API_KEY = process.env.YOUTUBE_API_KEY;
// Define o número máximo de resultados a serem buscados por playlist em uma única requisição.
const MAX_RESULTS_PER_PLAYLIST = 50;

// Handler da função serverless. 'req' é o objeto da requisição, 'res' é o objeto da resposta.
module.exports = async (req, res) => {
    // Extrai 'playlistId' dos parâmetros da query da URL (ex: /api/youtube?playlistId=XXXX).
    const { playlistId } = req.query;
    console.log(`[API /api/youtube] Recebida requisição para playlistId: ${playlistId}`);

    // Validação: Verifica se playlistId foi fornecido.
    if (!playlistId) {
        console.error("[API /api/youtube] Erro: Playlist ID é obrigatório na query string.");
        return res.status(400).json({ error: "O ID da Playlist é obrigatório." });
    }

    // Validação: Verifica se a chave da API está configurada no servidor.
    if (!API_KEY) {
        console.error("[API /api/youtube] ERRO CRÍTICO: Chave da API do YouTube (YOUTUBE_API_KEY) não está configurada nas variáveis de ambiente do backend.");
        return res.status(500).json({ error: "Erro de configuração do servidor. A chave da API está ausente." });
    } else {
        // Confirmação de que a chave foi encontrada (não loga a chave em si por segurança).
        console.log("[API /api/youtube] Chave da API do YouTube encontrada e carregada do ambiente do backend.");
    }

    // Monta a URL para a API de Dados do YouTube v3.
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${MAX_RESULTS_PER_PLAYLIST}&key=${API_KEY}`;
    // Log da URL, substituindo a chave real por um placeholder por segurança no log.
    console.log(`[API /api/youtube] URL da API do YouTube montada: ${url.replace(API_KEY, 'CHAVE_REMOVIDA_DO_LOG')}`);

    try {
        // Faz a requisição HTTP para a API do YouTube.
        console.log(`[API /api/youtube] Fazendo requisição para a API do YouTube para playlist: ${playlistId}`);
        const youtubeResponse = await fetch(url);
        console.log(`[API /api/youtube] Resposta da API do YouTube - Status: ${youtubeResponse.status} para playlist: ${playlistId}`);

        // Verifica se a resposta da API do YouTube não foi bem-sucedida (status code não é 2xx).
        if (!youtubeResponse.ok) {
            // Tenta obter detalhes do erro do corpo da resposta JSON.
            const errorData = await youtubeResponse.json().catch(() => ({ error: { message: "Falha ao decodificar JSON de erro da API do YouTube." }}));
            console.error(`[API /api/youtube] Erro ao buscar playlist ${playlistId} da API do YouTube: Status ${youtubeResponse.status}`, errorData);
            // Retorna o status de erro e uma mensagem para o cliente.
            return res.status(youtubeResponse.status).json({
                error: `Erro da API do YouTube: ${errorData.error?.message || youtubeResponse.statusText}`,
                details: errorData.error
            });
        }

        // Se a resposta foi bem-sucedida, converte o corpo da resposta para JSON.
        const data = await youtubeResponse.json();
        console.log(`[API /api/youtube] Dados recebidos com sucesso da API do YouTube para playlist: ${playlistId}. Número de itens: ${data.items ? data.items.length : 0}`);

        // Extrai apenas os IDs dos vídeos dos itens da playlist.
        const videoIds = data.items.map(item => item.snippet.resourceId.videoId);
        // Log de alguns IDs de vídeo para confirmação (não todos, para não poluir o log).
        console.log(`[API /api/youtube] IDs de vídeo extraídos para playlist ${playlistId}: Total ${videoIds.length}. Primeiros: ${videoIds.slice(0, 3).join(', ') + (videoIds.length > 3 ? '...' : '')}`);

        // Retorna uma resposta de sucesso (status 200) com os IDs dos vídeos.
        return res.status(200).json({ videoIds });

    } catch (error) {
        // Captura erros de rede ou outros erros inesperados durante o processo.
        console.error(`[API /api/youtube] Erro de rede ou interno ao processar playlist ${playlistId}:`, error.message, error.stack);
        return res.status(500).json({ error: "Erro interno do servidor ao buscar dados da playlist." });
    }
};
