import { Injectable, signal } from '@angular/core';
import { ProductoResponse } from '../modelos/catalogo';

export interface PresetImagen {
  nombre: string;
  tipo: string;
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImagenesProductoService {
  private readonly STORAGE_KEY = 'accesoriosmoto_imagenes_productos';

  // Mapeo en memoria y sincronizado con localStorage: productoId -> imagenUrl (o Data URL base64)
  private imagenesPersonalizadas = signal<Record<string, string>>({});

  // Galeria de imagenes profesionales de estudio en fondo blanco puro
  public readonly presets: PresetImagen[] = [
    // Cascos
    { nombre: 'Casco AGV K3 Negro', tipo: 'Casco', url: '/productos/casco-agv-k3-negro.jpg' },
    { nombre: 'Casco LS2 Blanco', tipo: 'Casco', url: '/productos/casco-ls2-blanco.jpg' },
    { nombre: 'Casco Scorpion EXO Negro Mate', tipo: 'Casco', url: '/productos/casco-scorpion-exo.jpg' },
    { nombre: 'Casco AGV Pista Carbono Rojo', tipo: 'Casco', url: '/productos/casco-carbono-rojo.jpg' },

    // Chaquetas
    { nombre: 'Chaqueta Alpinestars Cuero Negro', tipo: 'Chaqueta', url: '/productos/chaqueta-alpinestars-cuero.jpg' },
    { nombre: 'Chaqueta Textil Roja Deportiva', tipo: 'Chaqueta', url: '/productos/chaqueta-textil-roja.jpg' },
    { nombre: 'Chaqueta Touring Gris Fluor', tipo: 'Chaqueta', url: '/productos/chaqueta-touring-gris.jpg' },
    { nombre: 'Chaqueta Cuero Marron Cafe Racer', tipo: 'Chaqueta', url: '/productos/chaqueta-cuero-marron.jpg' },

    // Guantes
    { nombre: 'Guantes Dainese Carbono Negro', tipo: 'Guantes', url: '/productos/guantes-dainese-negro.jpg' },
    { nombre: 'Guantes Racing Rojo Carbono', tipo: 'Guantes', url: '/productos/guantes-racing-rojo.jpg' },

    // Baules
    { nombre: 'Baul Givi Monokey 45L Negro', tipo: 'Baul', url: '/productos/baul-givi-negro.jpg' },
    { nombre: 'Baul Aventura Aluminio Cepillado', tipo: 'Baul', url: '/productos/baul-aluminio-aventura.jpg' },

    // Impermeables
    { nombre: 'Impermeable Rainwear Azul Marino', tipo: 'Impermeable', url: '/productos/impermeable-rainwear-azul.jpg' },
    { nombre: 'Impermeable Fluor Alta Visibilidad', tipo: 'Impermeable', url: '/productos/impermeable-fluor.jpg' },

    // Intercomunicadores
    { nombre: 'Intercomunicador Cardo Packtalk Edge', tipo: 'Intercomunicador', url: '/productos/intercomunicador-cardo-gris.jpg' },
    { nombre: 'Intercomunicador Sena 50S Jog Dial', tipo: 'Intercomunicador', url: '/productos/intercom-sena-jogdial.jpg' },
    { nombre: 'Intercomunicador FreedConn Pantalla LCD', tipo: 'Intercomunicador', url: '/productos/intercom-freedconn-lcd.jpg' },

    // Visores
    { nombre: 'Visor Transparente Pinlock Antifog', tipo: 'Visor', url: '/productos/visor-agv-transparente.jpg' },
    { nombre: 'Visor Iridium Azul Espejado', tipo: 'Visor', url: '/productos/visor-iridium-azul.jpg' },
    { nombre: 'Visor Iridium Oro Espejado', tipo: 'Visor', url: '/productos/visor-iridium-oro.jpg' },
    { nombre: 'Visor Humo Oscuro UV400', tipo: 'Visor', url: '/productos/visor-humo-oscuro.jpg' },

    // Soporte Celular
    { nombre: 'Soporte Quad Lock Manillar', tipo: 'SoporteCelular', url: '/productos/soporte-quadlock-negro.jpg' },
  ];

  constructor() {
    this.cargarDeStorage();
  }

  private cargarDeStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.imagenesPersonalizadas.set(JSON.parse(raw));
      }
    } catch {
      this.imagenesPersonalizadas.set({});
    }
  }

  guardarImagen(productoId: string, url: string): void {
    if (!productoId || !url) return;
    const mapaActual = { ...this.imagenesPersonalizadas(), [productoId]: url };
    this.imagenesPersonalizadas.set(mapaActual);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mapaActual));
    } catch (e) {
      console.warn('No se pudo guardar la imagen en localStorage:', e);
    }
  }

  obtenerImagen(prod: ProductoResponse): string {
    if (!prod) return '/productos/casco-agv-k3-negro.jpg';

    // 1. Si el backend ya retorna imagenUrl directamente en el DTO (descartando antiguos banners o URLs rotas)
    if (prod.imagenUrl && prod.imagenUrl.trim() && !prod.imagenUrl.includes('banner-') && !prod.imagenUrl.includes('unsplash')) {
      return prod.imagenUrl;
    }

    // 2. Si se guardo una imagen localmente al crear o editar el producto
    const guardada = this.imagenesPersonalizadas()[prod.id];
    if (guardada) {
      return guardada;
    }

    // 3. Mapeo inteligente segun ID de las semillas del backend
    const id = prod.id || '';
    if (id === 'seed-casco-1') return '/productos/casco-agv-k3-negro.jpg';
    if (id === 'seed-casco-2') return '/productos/casco-ls2-blanco.jpg';
    if (id === 'seed-chaqueta-1') return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (id === 'seed-guantes-1') return '/productos/guantes-dainese-negro.jpg';
    if (id === 'seed-impermeable-1') return '/productos/impermeable-rainwear-azul.jpg';
    if (id === 'seed-intercom-1') return '/productos/intercomunicador-cardo-gris.jpg';
    if (id === 'seed-soporte-1') return '/productos/soporte-quadlock-negro.jpg';
    if (id === 'seed-baul-1') return '/productos/baul-givi-negro.jpg';
    if (id === 'seed-visor-1') return '/productos/visor-agv-transparente.jpg';

    // 4. Mapeo generico profesional por tipo, color y marca con fondo blanco de estudio
    const tipo = (prod.tipo || '').toLowerCase();
    const color = (prod.color || '').toLowerCase();
    const marca = (typeof prod.marca === 'string' ? prod.marca : ((prod.marca as any)?.nombre || '')).toLowerCase();

    if (tipo.includes('casco')) {
      if (color.includes('blanco')) return '/productos/casco-ls2-blanco.jpg';
      if (color.includes('rojo') || color.includes('carbon')) return '/productos/casco-carbono-rojo.jpg';
      if (color.includes('mate') || color.includes('titanio') || color.includes('gris')) return '/productos/casco-scorpion-exo.jpg';
      return '/productos/casco-agv-k3-negro.jpg';
    }

    if (tipo.includes('chaqueta')) {
      if (color.includes('rojo')) return '/productos/chaqueta-textil-roja.jpg';
      if (color.includes('marr') || color.includes('caf') || color.includes('vintage') || color.includes('caramelo') || color.includes('tabaco')) {
        return '/productos/chaqueta-cuero-marron.jpg';
      }
      if (color.includes('gris') || color.includes('fl') || color.includes('verde') || color.includes('glaciar') || color.includes('aventura')) {
        return '/productos/chaqueta-touring-gris.jpg';
      }
      return '/productos/chaqueta-alpinestars-cuero.jpg';
    }

    if (tipo.includes('guante')) {
      if (color.includes('rojo') || color.includes('carrera') || color.includes('pista')) {
        return '/productos/guantes-racing-rojo.jpg';
      }
      return '/productos/guantes-dainese-negro.jpg';
    }

    if (tipo.includes('impermeable')) {
      if (color.includes('fl') || color.includes('amarillo') || color.includes('ne') || color.includes('naranja') || color.includes('verde')) {
        return '/productos/impermeable-fluor.jpg';
      }
      return '/productos/impermeable-rainwear-azul.jpg';
    }

    if (tipo.includes('intercom')) {
      if (marca.includes('sena') || color.includes('satinado') || color.includes('jog')) {
        return '/productos/intercom-sena-jogdial.jpg';
      }
      if (marca.includes('freedconn') || color.includes('display') || color.includes('lcd')) {
        return '/productos/intercom-freedconn-lcd.jpg';
      }
      return '/productos/intercomunicador-cardo-gris.jpg';
    }

    if (tipo.includes('baul') || tipo.includes('baúl')) {
      if (color.includes('aluminio') || color.includes('plata') || color.includes('cepillado')) {
        return '/productos/baul-aluminio-aventura.jpg';
      }
      return '/productos/baul-givi-negro.jpg';
    }

    if (tipo.includes('visor')) {
      if (color.includes('azul')) return '/productos/visor-iridium-azul.jpg';
      if (color.includes('oro') || color.includes('dorado')) return '/productos/visor-iridium-oro.jpg';
      if (color.includes('humo') || color.includes('oscuro') || color.includes('smoke')) return '/productos/visor-humo-oscuro.jpg';
      return '/productos/visor-agv-transparente.jpg';
    }

    if (tipo.includes('soporte')) {
      return '/productos/soporte-quadlock-negro.jpg';
    }

    return '/productos/casco-agv-k3-negro.jpg';
  }
}

