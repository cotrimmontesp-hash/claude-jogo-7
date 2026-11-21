export interface Heroi {
  id: 'ines' | 'tome';
  nome: string; genero: 'mulher' | 'homem';
  historia: string;
  bonus: { furtividade: number; forca: number; agilidade: number };
  modelo: string;
}

export const HEROIS: Heroi[] = [
  { id: 'ines', nome: 'Inês', genero: 'mulher',
    historia: 'Sobrevivente da aldeia queimada. Rápida nos telhados e silenciosa nas sombras.',
    bonus: { furtividade: 1.2, forca: 0.95, agilidade: 1.15 }, modelo: 'herois/ines.glb' },
  { id: 'tome', nome: 'Tomé', genero: 'homem',
    historia: 'Ex-ferreiro das minas que fugiu do Conselho de Ferro. Forte e resistente em combate.',
    bonus: { furtividade: 0.95, forca: 1.2, agilidade: 1.0 }, modelo: 'herois/tome.glb' },
];
