// Skins (só visual, não mudam atributos). Ganhas jogando: história, caçadas, conquistas e prêmio diário.
import type { Raridade } from './items';

export interface Skin {
  id: string; nome: string; para: 'ines' | 'tome' | 'ambos' | 'montaria' | 'arma';
  raridade: Raridade; comoGanhar: string; modelo: string;
}

export const SKINS: Skin[] = [
  // Inês
  { id: 'ines_padrao', nome: 'Manto da Aldeia', para: 'ines', raridade: 'comum', comoGanhar: 'Inicial', modelo: 'skins/ines_padrao.glb' },
  { id: 'ines_irmandade', nome: 'Manto Branco da Irmandade', para: 'ines', raridade: 'raro', comoGanhar: 'Capítulo 4', modelo: 'skins/ines_irmandade.glb' },
  { id: 'ines_cacadora', nome: 'Caçadora da Onça', para: 'ines', raridade: 'epico', comoGanhar: 'Derrotar a Onça Negra', modelo: 'skins/ines_cacadora.glb' },
  { id: 'ines_baile', nome: 'Vestido do Baile (disfarce)', para: 'ines', raridade: 'epico', comoGanhar: 'Capítulo 8', modelo: 'skins/ines_baile.glb' },
  { id: 'ines_sombra', nome: 'Sombra Noturna', para: 'ines', raridade: 'lendario', comoGanhar: '100 eliminações furtivas', modelo: 'skins/ines_sombra.glb' },
  // Tomé
  { id: 'tome_padrao', nome: 'Ferreiro das Minas', para: 'tome', raridade: 'comum', comoGanhar: 'Inicial', modelo: 'skins/tome_padrao.glb' },
  { id: 'tome_irmandade', nome: 'Manto Escuro da Irmandade', para: 'tome', raridade: 'raro', comoGanhar: 'Capítulo 4', modelo: 'skins/tome_irmandade.glb' },
  { id: 'tome_tropeiro', nome: 'Tropeiro da Serra', para: 'tome', raridade: 'epico', comoGanhar: 'Viajar 50 km montado', modelo: 'skins/tome_tropeiro.glb' },
  { id: 'tome_jacare', nome: 'Couraça de Escamas', para: 'tome', raridade: 'epico', comoGanhar: 'Derrotar o Jacaré Ancestral', modelo: 'skins/tome_jacare.glb' },
  { id: 'tome_lanterna', nome: 'Guardião da Lanterna', para: 'tome', raridade: 'lendario', comoGanhar: 'Concluir a história', modelo: 'skins/tome_lanterna.glb' },
  // Os dois
  { id: 'capa_rubra', nome: 'Capa Rubra', para: 'ambos', raridade: 'raro', comoGanhar: 'Prêmio diário (7 dias seguidos)', modelo: 'skins/capa_rubra.glb' },
  { id: 'mascara_carnaval', nome: 'Máscara de Festa', para: 'ambos', raridade: 'epico', comoGanhar: 'Evento de festa na cidade', modelo: 'skins/mascara_carnaval.glb' },
  // Montarias
  { id: 'cavalo_branco', nome: 'Pelagem Branca', para: 'montaria', raridade: 'raro', comoGanhar: 'Domar 5 cavalos', modelo: 'skins/cavalo_branco.glb' },
  { id: 'cavalo_negro', nome: 'Pelagem Negra', para: 'montaria', raridade: 'epico', comoGanhar: 'Vencer 10 corridas a cavalo', modelo: 'skins/cavalo_negro.glb' },
  { id: 'cavalo_dourado', nome: 'Arreios Dourados', para: 'montaria', raridade: 'lendario', comoGanhar: 'Ouro das minas (Capítulo 10)', modelo: 'skins/cavalo_dourado.glb' },
  // Armas
  { id: 'lamina_ouro', nome: 'Lâmina Dourada', para: 'arma', raridade: 'epico', comoGanhar: 'Evoluir uma arma ao +5', modelo: 'skins/lamina_ouro.glb' },
  { id: 'lamina_brasa', nome: 'Lâmina em Brasa', para: 'arma', raridade: 'lendario', comoGanhar: 'Sobreviver 30 dias', modelo: 'skins/lamina_brasa.glb' },
];
