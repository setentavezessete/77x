// api/playlists-config.js
const fetch = require('node-fetch');

// Chave da API do YouTube e IDs dos Canais lidos das variáveis de ambiente
const API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID_A = process.env.CHANNEL_ID_A;
const CHANNEL_ID_B = process.env.CHANNEL_ID_B;
const MAX_PLAYLISTS_PER_CHANNEL = 50; // Limite de playlists a buscar por canal (máximo da API por página)

/**
 * Busca todas as playlists de um canal específico.
 * @param {string} channelId O ID do canal do YouTube.
 * @param {string} apiKey A chave da API do YouTube.
 * @returns {Promise<Array<{id: string, title: string}>>} Uma promessa que resolve para um array de objetos de playlist.
 */
async function fetchPlaylistsForChannel(channelId, apiKey) {
    if (!channelId) {
        console.error("[API fetchPlaylistsForChannel] ID do Canal não fornecido.");
        return [];
    }
    // O endpoint 'playlists' busca as playlists de um canal.
    const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,id&channelId=${channelId}&maxResults=${MAX_PLAYLISTS_PER_CHANNEL}&key=${apiKey}`;
    console.log(`[API fetchPlaylistsForChannel] Buscando playlists para o canal ${channelId}. URL (chave omitida): ${url.replace(apiKey, 'CHAVE_REMOVIDA')}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Falha ao decodificar JSON de erro da API."}}));
            console.error(`[API fetchPlaylistsForChannel] Erro ${response.status} ao buscar playlists para o canal ${channelId}:`, errorData.error?.message || response.statusText, errorData);
            return [];
        }
        const data = await response.json();
        // Mapeia os itens para um formato mais simples: { id, title }
        // A API retorna as playlists na ordem em que aparecem no canal.
        // Para garantir a ordem de criação, precisaríamos de mais lógica ou usar 'publishedAt' se disponível e desejado.
        // Por agora, usamos a ordem padrão retornada pela API.
        const playlists = data.items.map(item => ({
            id: item.id,
            title: item.snippet.title
        }));
        console.log(`[API fetchPlaylistsForChannel] Encontradas ${playlists.length} playlists para o canal ${channelId}.`);
        return playlists;
    } catch (error) {
        console.error(`[API fetchPlaylistsForChannel] Erro de rede ao buscar playlists para o canal ${channelId}:`, error);
        return [];
    }
}

// Handler da função serverless
module.exports = async (req, res) => {
    console.log("[API /api/playlists-config] Iniciando geração dinâmica de pares de playlists.");

    if (!API_KEY) {
        console.error("[API /api/playlists-config] ERRO CRÍTICO: YOUTUBE_API_KEY não definida.");
        return res.status(500).json({ error: "Configuração do servidor incompleta (chave API ausente)." });
    }
    if (!CHANNEL_ID_A || !CHANNEL_ID_B) {
        console.error("[API /api/playlists-config] ERRO CRÍTICO: CHANNEL_ID_A ou CHANNEL_ID_B não definidos.");
        return res.status(500).json({ error: "Configuração do servidor incompleta (IDs de canal ausentes)." });
    }

    try {
        // Busca as playlists para ambos os canais em paralelo
        const [playlistsA, playlistsB] = await Promise.all([
            fetchPlaylistsForChannel(CHANNEL_ID_A, API_KEY),
            fetchPlaylistsForChannel(CHANNEL_ID_B, API_KEY)
        ]);

        if (playlistsA.length === 0 && playlistsB.length === 0) {
            console.warn("[API /api/playlists-config] Nenhuma playlist encontrada para ambos os canais.");
             return res.status(200).json([]); 
        }
        
        const pairedPlaylists = [];
        // Inverte as listas para tentar pegar da mais antiga para a mais nova (a API geralmente retorna da mais nova para a mais antiga)
        // Se a ordem de criação for crucial e a API não a fornecer diretamente, esta é uma heurística.
        const reversedPlaylistsA = [...playlistsA].reverse();
        const reversedPlaylistsB = [...playlistsB].reverse();

        const shorterListLength = Math.min(reversedPlaylistsA.length, reversedPlaylistsB.length);

        console.log(`[API /api/playlists-config] Canal A tem ${reversedPlaylistsA.length} playlists. Canal B tem ${reversedPlaylistsB.length} playlists. Formando ${shorterListLength} pares (ordem invertida para simular 'mais antiga primeiro').`);

        for (let i = 0; i < shorterListLength; i++) {
            pairedPlaylists.push({
                name: `Par ${i + 1} (${reversedPlaylistsA[i].title.substring(0,15)}... & ${reversedPlaylistsB[i].title.substring(0,15)}...)`, 
                p1: reversedPlaylistsA[i].id, 
                p2: reversedPlaylistsB[i].id  
            });
        }
        
        if (pairedPlaylists.length === 0) {
            console.warn("[API /api/playlists-config] Nenhum par de playlists pôde ser formado (um dos canais pode não ter playlists, ou não há playlists correspondentes na ordem).");
        }

        console.log(`[API /api/playlists-config] ${pairedPlaylists.length} pares de playlists gerados dinamicamente.`);
        return res.status(200).json(pairedPlaylists);

    } catch (error) {
        console.error("[API /api/playlists-config] Erro inesperado durante a geração dos pares de playlists:", error);
        return res.status(500).json({ error: "Erro interno ao gerar configuração de playlists." });
    }
};
