export type Period = 'manana' | 'tarde' | 'noche';

export interface Pictogram {
  id: string;
  text: string;
  imageUrl?: string;
  localUri?: string;
  isBase64?: boolean;
  forbidden: boolean;
  addedAt: number;
}

export interface AgendaDay {
  manana: Pictogram[];
  tarde: Pictogram[];
  noche: Pictogram[];
}

export type PictoSize = 'small' | 'normal' | 'large';

export interface Settings {
  pictoSize: PictoSize;
  ttsLang: string;
  ttsRate: number;
}

export const PICTO_SIZES: Record<PictoSize, number> = {
  small: 52,
  normal: 66,
  large: 84,
};

export const COLORS = {
  primary: '#1a9e7a',
  inicio: '#FF5722',
  exportar: '#E53935',
  borrar: '#E53935',
  prohibir: '#FF5722',
  eliminar: '#424242',
  fondo: '#f0f0f0',
  prohibicion: '#E53935',
  manana: '#FFE4E8',
  tarde: '#FFFDE7',
  noche: '#E8F5E9',
};

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];