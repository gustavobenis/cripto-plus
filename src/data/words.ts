import type { WordEntry } from '../lib/crossword';
import { EXTRA } from './words-extra';

// Formato: RESPOSTA | pista | dica contextual | nível de familiaridade (1 comum … 3 exige repertório)
// Todas as pistas são originais. Respostas em A–Z, sem acentos.
const parse = (rows: string[]): WordEntry[] =>
  rows.map((row) => {
    const [answer, clue, hint, tier] = row.split('|');
    return { answer, clue, hint, tier: Number(tier) as 1 | 2 | 3 };
  });

const BASE: Record<string, WordEntry[]> = {
  historia: parse([
    'PIRAMIDE|Monumento egípcio de faces triangulares|Os faraós eram sepultados em uma delas|1',
    'FARAO|Soberano do Antigo Egito|Tutancâmon foi um deles|1',
    'CABRAL|Navegador que chegou ao Brasil em 1500|Comandava a frota portuguesa|1',
    'REPUBLICA|Regime proclamado no Brasil em 1889|Substituiu o Império|2',
    'IMPERIO|Governo chefiado por um imperador|Roma teve um dos mais famosos|1',
    'CASTELO|Fortaleza medieval de nobres|Costuma ter muralhas e torres|1',
    'GUTENBERG|Inventor da prensa de tipos móveis|Alemão do século XV|3',
    'FEUDALISMO|Sistema social da Idade Média|Baseava-se na relação entre senhores e vassalos|3',
    'ROMA|Capital do império que dominou o Mediterrâneo|Cidade das sete colinas|1',
    'ESCRAVIDAO|Regime abolido no Brasil em 1888|Terminou com a Lei Áurea|2',
    'GLADIADOR|Lutador das arenas romanas|O Coliseu era seu palco|2',
    'MUMIA|Corpo preservado pelos antigos egípcios|Envolvida em faixas de linho|1',
    'INCAS|Povo andino que construiu Machu Picchu|Império com capital em Cusco|2',
    'RENASCENCA|Movimento cultural europeu dos séculos XIV a XVI|Leonardo da Vinci foi um de seus nomes|3',
  ]),
  geografia: parse([
    'AMAZONAS|Estado brasileiro de maior área|Sua capital é Manaus|2',
    'BRASILIA|Capital federal do Brasil|Inaugurada em 1960|1',
    'EQUADOR|Linha imaginária que divide a Terra em hemisférios|Tem latitude zero|1',
    'PANTANAL|Maior planície alagável do planeta|Bioma de Mato Grosso e Mato Grosso do Sul|2',
    'ISLANDIA|País insular do Atlântico Norte, terra de gelo e vulcões|Sua capital é Reykjavik|3',
    'DESERTO|Região árida com pouca chuva|O Saara é o maior de todos os quentes|1',
    'CONTINENTE|Grande massa de terra cercada por oceanos|A Oceania é um deles|2',
    'LISBOA|Capital de Portugal|Banhada pelo rio Tejo|1',
    'NILO|Rio que atravessa o Egito|Um dos mais extensos do mundo|1',
    'ARGENTINA|País vizinho do Brasil cuja capital é Buenos Aires|Fala-se espanhol|1',
    'ARQUIPELAGO|Conjunto de ilhas|Fernando de Noronha é um|3',
    'MERIDIANO|Linha imaginária que liga os polos|O de Greenwich é referência para os fusos|3',
    'CATARATAS|Quedas-d’água do Iguaçu|Ficam na fronteira com a Argentina|2',
    'JAPAO|País do Monte Fuji|Chamado de Terra do Sol Nascente|1',
  ]),
  ciencias: parse([
    'ATOMO|Unidade básica da matéria|Tem prótons, nêutrons e elétrons|1',
    'GRAVIDADE|Força que nos mantém presos ao chão|Newton a descreveu|1',
    'OXIGENIO|Gás essencial à respiração|Tem símbolo O na tabela periódica|1',
    'PLANETA|Corpo celeste que orbita uma estrela|Marte é um deles|1',
    'ECLIPSE|Alinhamento entre Sol, Terra e Lua|Pode ser solar ou lunar|2',
    'CELULA|Menor unidade viva dos organismos|Possui membrana e núcleo|1',
    'VACINA|Preparado que estimula as defesas contra doenças|Edward Jenner foi um pioneiro|1',
    'CLOROFILA|Pigmento verde das plantas|Capta a luz solar|2',
    'GALAXIA|Imenso conjunto de estrelas, como a Via Láctea|Nossa casa cósmica|2',
    'MOLECULA|União de dois ou mais átomos|A água é H2O|2',
    'VULCAO|Abertura da crosta que expele lava|O Vesúvio é um dos mais famosos|1',
    'NEURONIO|Célula do sistema nervoso|Transmite impulsos elétricos|2',
    'TELESCOPIO|Instrumento para observar astros distantes|Galileu o aperfeiçoou|2',
    'ENERGIA|Capacidade de realizar trabalho|Pode ser solar, eólica ou hidráulica|1',
  ]),
  natureza: parse([
    'ELEFANTE|Maior mamífero terrestre|Tem tromba e presas|1',
    'BALEIA|Mamífero gigante dos oceanos|Canta em águas profundas|1',
    'ONCA|Maior felino das Américas|A pintada vive no Pantanal|1',
    'ARARA|Ave colorida de bico forte|Pode ser azul ou vermelha|1',
    'BORBOLETA|Inseto de asas coloridas|Antes de voar, foi lagarta|1',
    'FLORESTA|Grande área coberta de árvores|A Amazônia é a maior tropical|1',
    'CORAL|Animal marinho que forma recifes|Há uma grande barreira dele na Austrália|2',
    'PINGUIM|Ave que não voa, mas nada muito bem|Vive no hemisfério sul|1',
    'CAMALEAO|Réptil que muda de cor|Tem língua longa e olhos giratórios|2',
    'TARTARUGA|Réptil de casco, conhecido pela longevidade|Anda devagar|1',
    'PREDADOR|Animal que caça outros para se alimentar|Oposto de presa|2',
    'HERBIVORO|Animal que só come vegetais|A vaca é um deles|2',
    'MANGUEZAL|Ecossistema costeiro de raízes aéreas|Berçário da vida marinha|3',
    'POLINIZACAO|Transporte do pólen entre flores|As abelhas são grandes agentes|3',
  ]),
  tecnologia: parse([
    'INTERNET|Rede mundial de computadores|Conecta bilhões de pessoas|1',
    'ALGORITMO|Sequência de passos para resolver um problema|Base de todo programa|2',
    'SOFTWARE|Parte lógica do computador|Oposto de hardware|2',
    'HARDWARE|Parte física do computador|Inclui placas e peças|2',
    'SENHA|Código secreto de acesso|Deve ser forte e única|1',
    'TECLADO|Periférico de entrada com teclas|Tem leiaute QWERTY|1',
    'ROBO|Máquina programável que executa tarefas|Pode ser industrial|1',
    'NAVEGADOR|Programa usado para acessar sites|Chrome e Firefox são exemplos|1',
    'PIXEL|Menor ponto de uma imagem digital|As telas têm milhões|1',
    'BATERIA|Fonte de energia do celular|Precisa ser recarregada|1',
    'CRIPTOGRAFIA|Técnica que embaralha mensagens para protegê-las|Usada em senhas e pagamentos|3',
    'SERVIDOR|Computador que fornece dados a outros|Hospeda sites|2',
    'DRONE|Aeronave não tripulada|Muito usada em filmagens|1',
    'NUVEM|Armazenamento de dados pela internet|Também é formada por vapor no céu|2',
  ]),
  esportes: parse([
    'FUTEBOL|Esporte mais popular do Brasil|Onze jogadores por equipe|1',
    'BASQUETE|Esporte em que se arremessa a bola na cesta|Foi criado nos Estados Unidos|1',
    'NATACAO|Modalidade disputada na piscina|Tem nados crawl e borboleta|1',
    'MARATONA|Corrida de 42 quilômetros|O nome vem de uma cidade grega|2',
    'OLIMPIADA|Maior competição esportiva do mundo|Acontece a cada quatro anos|1',
    'ARBITRO|Juiz da partida|Usa apito e cartões|1',
    'PODIO|Local onde sobem os medalhistas|Tem três degraus|1',
    'VOLEI|Esporte com rede em que a bola não pode cair|Joga-se com seis em quadra|1',
    'RAQUETE|Equipamento do tênis|Também é usada no badminton|1',
    'GOLEIRO|Jogador que defende o gol|Único que usa as mãos no futebol|1',
    'ESGRIMA|Esporte de combate com espadas|Usa máscara e traje branco|2',
    'JUDO|Arte marcial japonesa de projeções|Praticada de kimono|1',
    'CICLISMO|Esporte disputado sobre bicicletas|O Tour de France é a maior prova|2',
    'TRIATLO|Prova que une natação, ciclismo e corrida|Exige muita resistência|3',
  ]),
};

export const BANK: Record<string, WordEntry[]> = Object.fromEntries(
  [...new Set([...Object.keys(BASE), ...Object.keys(EXTRA)])].map((k) => [k, [...(BASE[k] ?? []), ...(EXTRA[k] ?? [])]]),
);

export const ALL_WORDS: WordEntry[] = Object.values(BANK).flat();
