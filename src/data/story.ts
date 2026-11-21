// Campanha longa: 5 atos, 15 capítulos, 4 missões principais cada (60) + missões secundárias e caçadas.

export interface Missao { id: string; titulo: string; objetivo: string; tipo: 'historia' | 'secundaria' | 'cacada'; }
export interface Capitulo { id: number; ato: number; titulo: string; regiao: string; missoes: Missao[]; }

const m = (cap: number, n: number, titulo: string, objetivo: string, tipo: Missao['tipo'] = 'historia'): Missao =>
  ({ id: `c${cap}m${n}`, titulo, objetivo, tipo });

export const ATOS = ['As Cinzas', 'A Irmandade', 'A Cidade do Ouro', 'As Minas', 'O Último Sino'];

export const CAPITULOS: Capitulo[] = [
  { id: 1, ato: 1, titulo: 'A Noite do Fogo', regiao: 'aldeia', missoes: [
    m(1, 1, 'Fuga', 'Escape da aldeia em chamas'), m(1, 2, 'Rastros', 'Siga as pegadas até o rio'),
    m(1, 3, 'Primeira Fogueira', 'Colete galhos e acenda uma fogueira'), m(1, 4, 'Caça de Sobrevivência', 'Cace uma capivara para comer') ] },
  { id: 2, ato: 1, titulo: 'A Mata Fechada', regiao: 'mata', missoes: [
    m(2, 1, 'Água Limpa', 'Encontre uma nascente'), m(2, 2, 'Couro e Osso', 'Crie sua primeira armadura de couro'),
    m(2, 3, 'Os Caçadores do Conselho', 'Escape dos batedores sem ser visto'), m(2, 4, 'O Abrigo', 'Construa um acampamento') ] },
  { id: 3, ato: 1, titulo: 'A Onça Negra', regiao: 'mata', missoes: [
    m(3, 1, 'Marcas nas Árvores', 'Investigue os ataques'), m(3, 2, 'Armadilha', 'Prepare iscas'),
    m(3, 3, 'O Covil', 'Encontre o covil da fera'), m(3, 4, 'Caçada Lendária', 'Derrote a Onça Negra', 'cacada') ] },
  { id: 4, ato: 2, titulo: 'A Lanterna Acesa', regiao: 'serra', missoes: [
    m(4, 1, 'O Sinal', 'Siga a luz da lanterna'), m(4, 2, 'Provação', 'Prove seu valor à Irmandade'),
    m(4, 3, 'A Lâmina Oculta', 'Receba e treine a lâmina oculta'), m(4, 4, 'Juramento', 'Faça o juramento') ] },
  { id: 5, ato: 2, titulo: 'Escola dos Telhados', regiao: 'serra', missoes: [
    m(5, 1, 'Escalada', 'Suba a torre do mosteiro'), m(5, 2, 'Salto de Fé', 'Pule no monte de feno'),
    m(5, 3, 'Sombras', 'Atravesse o pátio sem ser visto'), m(5, 4, 'Visão de Águia', 'Encontre 5 alvos marcados') ] },
  { id: 6, ato: 2, titulo: 'O Traidor', regiao: 'serra', missoes: [
    m(6, 1, 'Mensagem Roubada', 'Recupere a carta'), m(6, 2, 'Perseguição', 'Persiga o mensageiro'),
    m(6, 3, 'Interrogatório', 'Descubra quem traiu'), m(6, 4, 'Emboscada', 'Sobreviva à emboscada') ] },
  { id: 7, ato: 3, titulo: 'Chegada a Vila Rica', regiao: 'cidade', missoes: [
    m(7, 1, 'Na Multidão', 'Entre na cidade misturado ao povo'), m(7, 2, 'Pontos de Observação', 'Sincronize 3 torres'),
    m(7, 3, 'O Ferreiro', 'Encontre o ferreiro da Irmandade'), m(7, 4, 'Esconderijo', 'Monte a base na cidade') ] },
  { id: 8, ato: 3, titulo: 'O Coletor de Impostos', regiao: 'cidade', missoes: [
    m(8, 1, 'Ouvir Conversas', 'Espione o coletor'), m(8, 2, 'Os Livros', 'Roube os registros'),
    m(8, 3, 'O Baile', 'Infiltre-se no baile'), m(8, 4, 'Primeiro Alvo', 'Derrube o Coletor') ] },
  { id: 9, ato: 3, titulo: 'Fogo na Igreja', regiao: 'cidade', missoes: [
    m(9, 1, 'Alarme', 'Salve os moradores'), m(9, 2, 'Telhados em Chamas', 'Fuja pelos telhados'),
    m(9, 3, 'O Capitão', 'Enfrente o Capitão da Guarda'), m(9, 4, 'Cinzas Outra Vez', 'Reencontre a Irmandade') ] },
  { id: 10, ato: 4, titulo: 'A Descida', regiao: 'minas', missoes: [
    m(10, 1, 'Disfarce', 'Entre nas minas disfarçado'), m(10, 2, 'Túneis Escuros', 'Atravesse os túneis'),
    m(10, 3, 'Aliados', 'Liberte os primeiros trabalhadores'), m(10, 4, 'Ferro e Ouro', 'Roube o ouro do Conselho') ] },
  { id: 11, ato: 4, titulo: 'O Pântano Proibido', regiao: 'pantano', missoes: [
    m(11, 1, 'Rota Secreta', 'Ache o caminho pelo pântano'), m(11, 2, 'O Ancestral', 'Derrote o Jacaré Ancestral', 'cacada'),
    m(11, 3, 'Escamas de Ferro', 'Forje armadura com escamas'), m(11, 4, 'A Vila Escondida', 'Encontre os fugitivos') ] },
  { id: 12, ato: 4, titulo: 'A Revolta', regiao: 'minas', missoes: [
    m(12, 1, 'Armas para o Povo', 'Entregue armas aos mineiros'), m(12, 2, 'A Grande Fuga', 'Abra os portões'),
    m(12, 3, 'O Feitor', 'Derrote o Feitor-Mor'), m(12, 4, 'Explosão', 'Destrua a mina principal') ] },
  { id: 13, ato: 5, titulo: 'O Cerco', regiao: 'cidade', missoes: [
    m(13, 1, 'Cidade Fechada', 'Entre na cidade sitiada'), m(13, 2, 'Os Três Conselheiros', 'Derrube os conselheiros'),
    m(13, 3, 'A Verdade', 'Descubra quem queimou a aldeia'), m(13, 4, 'Sem Volta', 'Escolha: vingança ou justiça') ] },
  { id: 14, ato: 5, titulo: 'A Torre do Sino', regiao: 'cidade', missoes: [
    m(14, 1, 'A Subida', 'Escale a torre sob ataque'), m(14, 2, 'Guardiões', 'Vença a guarda de elite'),
    m(14, 3, 'O Grão-Conselheiro', 'Duelo final'), m(14, 4, 'O Último Sino', 'Toque o sino da liberdade') ] },
  { id: 15, ato: 5, titulo: 'Depois da Tempestade', regiao: 'cidade', missoes: [
    m(15, 1, 'Reconstrução', 'Ajude a reconstruir a cidade'), m(15, 2, 'Nova Irmandade', 'Treine novos recrutas'),
    m(15, 3, 'O Segredo da Lanterna', 'Descubra a origem da Irmandade'), m(15, 4, 'Epílogo', 'Final de acordo com suas escolhas') ] },
];

// Missões secundárias repetíveis por região (deixam o jogo bem mais longo)
export const SECUNDARIAS = [
  'Caçar 5 animais da região', 'Entregar suprimentos para refugiados', 'Libertar prisioneiros da guarda',
  'Encontrar baús escondidos', 'Sincronizar torres de observação', 'Derrotar um capitão do Conselho',
];
