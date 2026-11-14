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

  // Galería de imágenes de estudio predeterminadas de alta calidad
  public readonly presets: PresetImagen[] = [
    { nombre: 'Casco Scorpion EXO Negro Mate', tipo: 'Casco', url: '/productos/casco-scorpion-exo.jpg' },
    { nombre: 'Casco AGV K3 Negro', tipo: 'Casco', url: '/productos/casco-agv-k3-negro.jpg' },
    { nombre: 'Casco LS2 Blanco', tipo: 'Casco', url: '/productos/casco-ls2-blanco.jpg' },
    { nombre: 'Chaqueta Alpinestars Cuero', tipo: 'Chaqueta', url: '/productos/chaqueta-alpinestars-cuero.jpg' },
    { nombre: 'Guantes Dainese Carbono', tipo: 'Guantes', url: '/productos/guantes-dainese-negro.jpg' },
    { nombre: 'Impermeable Rainwear Azul', tipo: 'Impermeable', url: '/productos/impermeable-rainwear-azul.jpg' },
    { nombre: 'Intercomunicador Cardo Packtalk', tipo: 'Intercomunicador', url: '/productos/intercomunicador-cardo-gris.jpg' },
    { nombre: 'Soporte Quad Lock Manubrio', tipo: 'SoporteCelular', url: '/productos/soporte-quadlock-negro.jpg' },
    { nombre: 'Baúl Givi Monokey 45L', tipo: 'Baul', url: '/productos/baul-givi-negro.jpg' },
    { nombre: 'Visor AGV Transparente Pinlock', tipo: 'Visor', url: '/productos/visor-agv-transparente.jpg' },
    { nombre: 'Visor Iridium Chameleon Violeta', tipo: 'Visor', url: '/productos/banner-visor-colecciones.jpg' },
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

    // 1. Si el backend ya retorna imagenUrl directamente en el DTO
    if (prod.imagenUrl && prod.imagenUrl.trim()) {
      return prod.imagenUrl;
    }

    // 2. Si se guardó una imagen localmente al crear o editar el producto
    const guardada = this.imagenesPersonalizadas()[prod.id];
    if (guardada) {
      return guardada;
    }

    // 3. Mapeo inteligente según ID de las semillas del backend
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

    // 4. Mapeo genérico por tipo y color
    const tipo = (prod.tipo || '').toLowerCase();
    const color = (prod.color || '').toLowerCase();

    if (tipo.includes('casco')) {
      return color.includes('blanco')
        ? '/productos/casco-ls2-blanco.jpg'
        : '/productos/casco-agv-k3-negro.jpg';
    }
    if (tipo.includes('chaqueta')) return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (tipo.includes('guante')) return '/productos/guantes-dainese-negro.jpg';
    if (tipo.includes('impermeable')) return '/productos/impermeable-rainwear-azul.jpg';
    if (tipo.includes('intercom')) return '/productos/intercomunicador-cardo-gris.jpg';
    if (tipo.includes('soporte')) return '/productos/soporte-quadlock-negro.jpg';
    if (tipo.includes('baul')) return '/productos/baul-givi-negro.jpg';
    if (tipo.includes('visor')) return '/productos/visor-agv-transparente.jpg';

    return '/productos/casco-agv-k3-negro.jpg';
  }
}
