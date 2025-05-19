// api/youtube.js

// Importa o 'node-fetch' para fazer requisições HTTP no ambiente Node.js.
// Em versões mais recentes do Node.js (18+), você poderia usar o fetch global,
// mas 'node-fetch' garante compatibilidade.
const fetch = require('node-fetch');

// A sua chave da API do YouTube será armazenada como uma variável de ambiente na Vercel.
// Isso é muito mais seguro do que colocá-la diretamente no código.
const API_KEY = process.env.YOUTUBE_API_KEY;
const MAX_RESULTS_PER_PLAYLIST = 50; // Limite de vídeos por busca na playlist

// Esta é a função principal que a Vercel executará quando o endpoint /api/youtube for chamado.
module.exports = async (req, res) => {
    // Extrai o 'playlistId' dos parâmetros da query da URL.
    // Ex: se a URL for /api/youtube?playlistId=SUA_PLAYLIST_ID, req.query.playlistId será "SUA_PLAYLIST_ID".
    const { playlistId } = req.query;

    // Verifica se o playlistId foi fornecido na requisição.
    if (!playlistId) {
        return res.status(400).json({ error: "O ID da Playlist é obrigatório." });
    }

    // Verifica se a chave da API do YouTube está configurada no ambiente do servidor.
    // Se não estiver, retorna um erro 500 (Erro Interno do Servidor).
    if (!API_KEY) {
        console.error("A chave da API do YouTube não está configurada no backend (variáveis de ambiente).");
        return res.status(500).json({ error: "Erro de configuração do servidor. Contacte o administrador." });
    }

    // Monta a URL para a API de Dados do YouTube v3 para buscar itens da playlist.
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${MAX_RESULTS_PER_PLAYLIST}&key=${API_KEY}`;

    try {
        // Faz a requisição para a API do YouTube.
        const youtubeResponse = await fetch(url);

        // Verifica se a resposta da API do YouTube não foi bem-sucedida (status code não é 2xx).
        if (!youtubeResponse.ok) {
            const errorData = await youtubeResponse.json(); // Tenta obter detalhes do erro da resposta.
            console.error(`Erro ao buscar playlist ${playlistId} da API do YouTube:`, youtubeResponse.status, errorData);
            // Retorna o status de erro e uma mensagem para o cliente.
            return res.status(youtubeResponse.status).json({
                error: `Erro da API do YouTube: ${errorData.error?.message || youtubeResponse.statusText}`,
                details: errorData.error // Inclui detalhes do erro da API, se disponíveis.
            });
        }

        // Se a resposta foi bem-sucedida, converte o corpo da resposta para JSON.
        const data = await youtubeResponse.json();

        // Extrai apenas os IDs dos vídeos dos itens da playlist.
        // Cada 'item' na resposta da API contém informações do vídeo, incluindo 'snippet.resourceId.videoId'.
        const videoIds = data.items.map(item => item.snippet.resourceId.videoId);

        // Retorna uma resposta de sucesso (status 200) com os IDs dos vídeos.
        return res.status(200).json({ videoIds });

    } catch (error) {
        // Captura erros de rede ou outros erros inesperados durante o processo.
        console.error(`Erro de rede ou interno ao processar a playlist ${playlistId}:`, error);
        return res.status(500).json({ error: "Erro interno do servidor ao buscar dados da playlist." });
    }
};
