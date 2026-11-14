import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { ComprasService } from '../../servicios/compras';
import { WishlistService } from '../../servicios/wishlist';
import { CarritoService } from '../../servicios/carrito';
import { ImagenesProductoService } from '../../servicios/imagenes-producto';
import { ProductoResponse, TipoCompatibilidad } from '../../modelos/catalogo';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class Catalogo implements OnInit {
  private catalogoService = inject(CatalogoService);
  public authService = inject(AuthService);
  public wishlistService = inject(WishlistService);
  public carritoService = inject(CarritoService);
  public imagenesService = inject(ImagenesProductoService);
  private comprasService = inject(ComprasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Lista de productos
  productos = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  // Categoría seleccionada
  categoriaActiva = signal<string>('TODOS');

  // Paginación
  pagina = signal<number>(0);
  tamano = signal<number>(12);
  totalPaginas = signal<number>(1);
  totalElementos = signal<number>(0);

  // Filtros
  busquedaTexto = '';
  filtroMarca = '';
  filtroColor = '';
  precioMin: number | null = null;
  precioMax: number | null = null;
  compatibilidadTipo: '' | TipoCompatibilidad = '';
  compatibilidadModelo = '';

  marcasDisponibles = ['AGV', 'LS2', 'Alpinestars', 'Dainese', 'Givi', 'Cardo', 'Quad Lock'];
  coloresDisponibles = ['Negro', 'Blanco', 'Azul', 'Gris', 'Transparente'];

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['categoria']) {
        const cat = params['categoria'].toUpperCase();
        this.categoriaActiva.set(cat);
      } else if (params['tipo']) {
        const t = params['tipo'].toUpperCase();
        this.categoriaActiva.set(t.includes('CASCO') ? 'CASCOS' : t);
      } else if (params['outlet']) {
        this.categoriaActiva.set('OUTLET');
      } else {
        this.categoriaActiva.set('TODOS');
      }

      if (params['q']) {
        this.busquedaTexto = params['q'];
      }
      if (params['marca']) {
        this.filtroMarca = params['marca'];
      }
      if (params['color']) {
        this.filtroColor = params['color'];
      }

      this.cargarProductos(0);
    });
  }

  cambiarCategoria(categoria: string): void {
    this.categoriaActiva.set(categoria);
    this.limpiarFiltrosInternos();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: categoria === 'TODOS' ? {} : { categoria: categoria.toLowerCase() },
    });

    this.cargarProductos(0);
  }

  cargarProductos(numPagina: number = 0): void {
    this.cargando.set(true);
    this.error.set(null);
    this.pagina.set(numPagina);

    // Llamamos siempre a listar enviando moneda 'COP' si hay filtros de precio para cumplir con la regla del backend
    this.catalogoService
      .listar({
        marca: this.filtroMarca.trim() || undefined,
        color: this.filtroColor.trim() || undefined,
        precioMinimo: this.precioMin ?? undefined,
        precioMaximo: this.precioMax ?? undefined,
        moneda: this.precioMin != null || this.precioMax != null ? 'COP' : undefined,
        tipoCompatibilidad: this.compatibilidadTipo || undefined,
        modeloCompatibilidad: this.compatibilidadModelo.trim() || undefined,
        pagina: numPagina,
        tamano: this.tamano(),
      })
      .subscribe({
        next: (resp) => {
          let items = resp.content;

          // 1. Filtrar según la pestaña activa (CASCOS, TEXTIL, ACCESORIOS, REPUESTOS, OUTLET)
          items = this.filtrarPorCategoria(items);

          // 2. Búsqueda local por texto en marca, tipo, color o ID
          if (this.busquedaTexto.trim()) {
            const query = this.busquedaTexto.trim().toLowerCase();
            items = items.filter(
              (p) =>
                (p.marca && p.marca.toLowerCase().includes(query)) ||
                (p.tipo && p.tipo.toLowerCase().includes(query)) ||
                (p.color && p.color.toLowerCase().includes(query)) ||
                (p.id && p.id.toLowerCase().includes(query))
            );
          }

          this.productos.set(items);
          this.totalElementos.set(items.length);
          this.totalPaginas.set(Math.max(1, Math.ceil(items.length / this.tamano())));
          this.cargando.set(false);
        },
        error: (err) => {
          this.error.set('No se pudo cargar el catálogo: ' + (err.error?.mensaje || err.message));
          this.cargando.set(false);
        },
      });
  }

  private filtrarPorCategoria(items: ProductoResponse[]): ProductoResponse[] {
    const cat = this.categoriaActiva();
    if (cat === 'CASCOS') {
      return items.filter((p) => p.tipo?.toLowerCase().includes('casco'));
    }
    if (cat === 'TEXTIL') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('chaqueta') || t.includes('guante') || t.includes('impermeable');
      });
    }
    if (cat === 'ACCESORIOS') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('baul') || t.includes('soporte') || t.includes('intercom');
      });
    }
    if (cat === 'REPUESTOS') {
      return items.filter((p) => {
        const t = p.tipo?.toLowerCase() || '';
        return t.includes('visor');
      });
    }
    if (cat === 'OUTLET') {
      return items.filter((p) => p.precioMonto <= 300000);
    }
    return items;
  }

  seleccionarMarca(marca: string): void {
    this.filtroMarca = this.filtroMarca === marca ? '' : marca;
    this.cargarProductos(0);
  }

  seleccionarColor(color: string): void {
    this.filtroColor = this.filtroColor === color ? '' : color;
    this.cargarProductos(0);
  }

  aplicarFiltros(): void {
    this.cargarProductos(0);
  }

  limpiarFiltros(): void {
    this.limpiarFiltrosInternos();
    this.categoriaActiva.set('TODOS');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.cargarProductos(0);
  }

  private limpiarFiltrosInternos(): void {
    this.busquedaTexto = '';
    this.filtroMarca = '';
    this.filtroColor = '';
    this.precioMin = null;
    this.precioMax = null;
    this.compatibilidadTipo = '';
    this.compatibilidadModelo = '';
  }

  comprar(producto: ProductoResponse): void {
    this.carritoService.agregar(producto, 1);
  }

  togglePublicacion(producto: ProductoResponse): void {
    if (producto.estadoPublicacion === 'PUBLICADO') {
      this.catalogoService.despublicar(producto.id).subscribe({
        next: () => {
          this.mensaje.set(`Producto ${producto.id} despublicado`);
          this.cargarProductos(this.pagina());
        },
        error: (err) => this.error.set('Error: ' + err.message),
      });
    } else {
      this.catalogoService.publicar(producto.id).subscribe({
        next: () => {
          this.mensaje.set(`Producto ${producto.id} publicado`);
          this.cargarProductos(this.pagina());
        },
        error: (err) => this.error.set('Error: ' + err.message),
      });
    }
  }

  eliminar(producto: ProductoResponse): void {
    if (!confirm(`¿Eliminar definitivamente el producto "${producto.marca} ${producto.tipo}"?`)) return;
    this.cargando.set(true);
    this.catalogoService.eliminar(producto.id).subscribe({
      next: () => {
        this.wishlistService.eliminar(producto.id);
        this.mensaje.set(`Producto "${producto.marca} ${producto.tipo}" eliminado del catálogo.`);
        this.cargarProductos(this.pagina());
        setTimeout(() => this.mensaje.set(null), 4000);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set('Error al eliminar producto: ' + (err.error?.mensaje || err.message));
      },
    });
  }

  /**
   * Obtiene la imagen adecuada (Backend -> Imagen personalizada -> Preset -> Fallback)
   */
  obtenerImagen(prod: ProductoResponse): string {
    return this.imagenesService.obtenerImagen(prod);
  }

  toggleWishlist(prod: ProductoResponse, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.wishlistService.toggle(prod);
  }

  onImgError(event: Event, prod: ProductoResponse): void {
    const target = event.target as HTMLImageElement;
    if (!target) return;
    const tipo = (prod.tipo || '').toLowerCase();
    if (tipo.includes('casco')) {
      target.src = '/productos/casco-agv-k3-negro.jpg';
    } else if (tipo.includes('chaqueta')) {
      target.src = '/productos/chaqueta-alpinestars-cuero.jpg';
    } else if (tipo.includes('guante')) {
      target.src = '/productos/guantes-dainese-negro.jpg';
    } else {
      target.src = '/productos/impermeable-rainwear-azul.jpg';
    }
  }

  obtenerBadge(prod: ProductoResponse): string {
    const t = prod.tipo?.toLowerCase() || '';
    if (t.includes('casco')) return 'ECE 22.06';
    if (t.includes('chaqueta')) return 'NIVEL 3';
    if (prod.precioMonto > 500000) return 'PREMIUM';
    return 'ORIGINAL';
  }

  // --- MODAL DE CREACIÓN DE PRODUCTOS (SOLO ADMINISTRADOR) ---
  modalCrearAbierto = signal<boolean>(false);
  guardandoProducto = signal<boolean>(false);

  // Opciones válidas para Enums requeridos por el Backend de Spring Boot
  readonly tallasDisponibles = ['XS', 'S', 'M', 'L', 'XL'];

  readonly nivelesProteccion = [
    { valor: 'NIVEL_1', label: 'Nivel 1 - Básico Urbano' },
    { valor: 'NIVEL_2', label: 'Nivel 2 - Protección Ciudad CE' },
    { valor: 'NIVEL_3', label: 'Nivel 3 - Deportivo / Carretera' },
    { valor: 'NIVEL_4', label: 'Nivel 4 - Alto Impacto Touring' },
    { valor: 'NIVEL_5', label: 'Nivel 5 - Máxima Competición Racing' },
  ];

  readonly materiales = [
    { valor: 'POLICARBONATO', label: 'Policarbonato de alta resistencia' },
    { valor: 'ABS', label: 'Termoplástico ABS' },
    { valor: 'FIBRA_DE_VIDRIO', label: 'Fibra de Vidrio' },
    { valor: 'FIBRA_DE_CARBONO', label: 'Fibra de Carbono' },
    { valor: 'KEVLAR', label: 'Kevlar' },
    { valor: 'CUERO', label: 'Cuero Genuino' },
    { valor: 'CUERO_SINTETICO', label: 'Cuero Sintético' },
    { valor: 'TEXTIL', label: 'Textil Cordura' },
    { valor: 'NYLON', label: 'Nylon de Alta Densidad' },
    { valor: 'POLIESTER', label: 'Poliéster' },
    { valor: 'ALUMINIO', label: 'Aluminio Reforzado' },
    { valor: 'PLASTICO', label: 'Plástico Inyectado' },
    { valor: 'PVC', label: 'PVC Impermeable' },
    { valor: 'ACERO', label: 'Acero Inoxidable' },
  ];

  // Formulario nuevo producto con soporte completo de imágenes y tipos del backend
  nuevoProducto = {
    tipo: 'Casco',
    marcaNombre: 'AGV',
    color: 'Negro',
    precioMonto: 650000,
    modelo: 'K3 SV Racing',
    talla: 'M',
    material: 'POLICARBONATO',
    proteccion: 'NIVEL_3',
    certificacionSeguridad: 'ECE 22.06',
    capacidadLitros: 45,
    dimensiones: '40x35x30 cm',
    capacidadMaximaCarga: 10,
    alcanceMetros: 1200,
    autonomiaHoras: 13,
    bluetooth: true,
    tipoSujecion: 'Manubrio',
    tipoVisor: 'Transparente Antirrayas Pinlock Ready',

    // Configuración de imagen (solo Galería y Descargas)
    modoImagen: 'preset' as 'preset' | 'descargados',
    imagenUrl: '/productos/casco-scorpion-exo.jpg',
    previewImagen: '/productos/casco-scorpion-exo.jpg',
  };

  abrirModalCrear(): void {
    this.modalCrearAbierto.set(true);
  }

  cerrarModalCrear(): void {
    this.modalCrearAbierto.set(false);
  }

  onTipoProductoChange(): void {
    const tipo = this.nuevoProducto.tipo;
    if (tipo === 'Casco') {
      this.nuevoProducto.talla = 'M';
      this.nuevoProducto.proteccion = 'NIVEL_3';
      this.nuevoProducto.material = 'POLICARBONATO';
      this.nuevoProducto.certificacionSeguridad = 'ECE 22.06';
      this.seleccionarPreset('/productos/casco-agv-k3-negro.jpg');
    } else if (tipo === 'Chaqueta') {
      this.nuevoProducto.talla = 'L';
      this.nuevoProducto.proteccion = 'NIVEL_2';
      this.nuevoProducto.material = 'CUERO';
      this.seleccionarPreset('/productos/chaqueta-alpinestars-cuero.jpg');
    } else if (tipo === 'Guantes') {
      this.nuevoProducto.talla = 'M';
      this.nuevoProducto.proteccion = 'NIVEL_2';
      this.nuevoProducto.material = 'CUERO';
      this.seleccionarPreset('/productos/guantes-dainese-negro.jpg');
    } else if (tipo === 'Impermeable') {
      this.nuevoProducto.talla = 'L';
      this.nuevoProducto.material = 'PVC';
      this.seleccionarPreset('/productos/impermeable-rainwear-azul.jpg');
    } else if (tipo === 'Baul') {
      this.nuevoProducto.material = 'ALUMINIO';
      this.nuevoProducto.capacidadLitros = 45;
      this.nuevoProducto.capacidadMaximaCarga = 10;
      this.nuevoProducto.dimensiones = '45x40x32 cm';
      this.seleccionarPreset('/productos/baul-givi-negro.jpg');
    } else if (tipo === 'Intercomunicador') {
      this.nuevoProducto.alcanceMetros = 1200;
      this.nuevoProducto.autonomiaHoras = 13;
      this.nuevoProducto.bluetooth = true;
      this.seleccionarPreset('/productos/intercomunicador-cardo-gris.jpg');
    } else if (tipo === 'SoporteCelular') {
      this.nuevoProducto.tipoSujecion = 'Manubrio';
      this.seleccionarPreset('/productos/soporte-quadlock-negro.jpg');
    } else if (tipo === 'Visor') {
      this.nuevoProducto.tipoVisor = 'Transparente Antirrayas Pinlock Ready';
      this.seleccionarPreset('/productos/visor-agv-transparente.jpg');
    }
  }

  seleccionarPreset(url: string): void {
    this.nuevoProducto.imagenUrl = url;
    this.nuevoProducto.previewImagen = url;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const fileNameLower = file.name.toLowerCase();

      // Detección directa de rutas locales estáticas de alta velocidad (0ms de lag):
      if (fileNameLower.includes('scorpion')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-scorpion-exo.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-scorpion-exo.jpg';
      } else if (fileNameLower.includes('agv') || fileNameLower.includes('k3')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-agv-k3-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-agv-k3-negro.jpg';
      } else if (fileNameLower.includes('ls2')) {
        this.nuevoProducto.imagenUrl = '/productos/casco-ls2-blanco.jpg';
        this.nuevoProducto.previewImagen = '/productos/casco-ls2-blanco.jpg';
      } else if (fileNameLower.includes('alpinestar') || fileNameLower.includes('chaqueta')) {
        this.nuevoProducto.imagenUrl = '/productos/chaqueta-alpinestars-cuero.jpg';
        this.nuevoProducto.previewImagen = '/productos/chaqueta-alpinestars-cuero.jpg';
      } else if (fileNameLower.includes('guante') || fileNameLower.includes('dainese')) {
        this.nuevoProducto.imagenUrl = '/productos/guantes-dainese-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/guantes-dainese-negro.jpg';
      } else if (fileNameLower.includes('impermeable')) {
        this.nuevoProducto.imagenUrl = '/productos/impermeable-rainwear-azul.jpg';
        this.nuevoProducto.previewImagen = '/productos/impermeable-rainwear-azul.jpg';
      } else if (fileNameLower.includes('cardo') || fileNameLower.includes('intercom')) {
        this.nuevoProducto.imagenUrl = '/productos/intercomunicador-cardo-gris.jpg';
        this.nuevoProducto.previewImagen = '/productos/intercomunicador-cardo-gris.jpg';
      } else if (fileNameLower.includes('baul') || fileNameLower.includes('givi')) {
        this.nuevoProducto.imagenUrl = '/productos/baul-givi-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/baul-givi-negro.jpg';
      } else if (fileNameLower.includes('soporte') || fileNameLower.includes('quad')) {
        this.nuevoProducto.imagenUrl = '/productos/soporte-quadlock-negro.jpg';
        this.nuevoProducto.previewImagen = '/productos/soporte-quadlock-negro.jpg';
      } else if (fileNameLower.includes('visor')) {
        this.nuevoProducto.imagenUrl = '/productos/visor-agv-transparente.jpg';
        this.nuevoProducto.previewImagen = '/productos/visor-agv-transparente.jpg';
      } else {
        const rutaEstatica = this.obtenerPresetPorTipo(this.nuevoProducto.tipo);
        this.nuevoProducto.imagenUrl = rutaEstatica;
        this.nuevoProducto.previewImagen = URL.createObjectURL(file);
      }
    }
  }

  obtenerPresetPorTipo(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('casco')) return '/productos/casco-scorpion-exo.jpg';
    if (t.includes('chaqueta')) return '/productos/chaqueta-alpinestars-cuero.jpg';
    if (t.includes('guante')) return '/productos/guantes-dainese-negro.jpg';
    if (t.includes('impermeable')) return '/productos/impermeable-rainwear-azul.jpg';
    if (t.includes('baul')) return '/productos/baul-givi-negro.jpg';
    if (t.includes('intercom')) return '/productos/intercomunicador-cardo-gris.jpg';
    if (t.includes('soporte')) return '/productos/soporte-quadlock-negro.jpg';
    if (t.includes('visor')) return '/productos/visor-agv-transparente.jpg';
    return '/productos/casco-scorpion-exo.jpg';
  }

  guardarNuevoProducto(): void {
    const p = this.nuevoProducto;
    const marcaId = 'marca-' + p.marcaNombre.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const precioMoneda = 'COP';
    const imagenFinal = p.imagenUrl || p.previewImagen || this.obtenerPresetPorTipo(p.tipo);

    // Ruta de catálogo segura y de alta velocidad:
    const imagenParaBackend =
      imagenFinal.startsWith('data:') || imagenFinal.length > 500
        ? this.obtenerPresetPorTipo(p.tipo)
        : imagenFinal;

    this.guardandoProducto.set(true);

    let obs;
    if (p.tipo === 'Casco') {
      obs = this.catalogoService.crearCasco({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        modelo: p.modelo.trim(),
        color: p.color.trim(),
        talla: p.talla,
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        proteccion: p.proteccion,
        certificacionSeguridad: p.certificacionSeguridad.trim() || 'ECE 22.06',
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Chaqueta') {
      obs = this.catalogoService.crearChaqueta({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        proteccion: p.proteccion,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Guantes') {
      obs = this.catalogoService.crearGuantes({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        proteccion: p.proteccion,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Impermeable') {
      obs = this.catalogoService.crearImpermeable({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        talla: p.talla,
        material: p.material,
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Baul') {
      obs = this.catalogoService.crearBaul({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        material: p.material,
        capacidadLitros: Number(p.capacidadLitros),
        dimensiones: p.dimensiones.trim() || '40x35x30 cm',
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        capacidadMaximaCarga: Number(p.capacidadMaximaCarga),
        color: p.color.trim(),
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'Intercomunicador') {
      obs = this.catalogoService.crearIntercomunicador({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        alcanceMetros: Math.round(Number(p.alcanceMetros)),
        autonomiaHoras: Math.round(Number(p.autonomiaHoras)),
        bluetooth: Boolean(p.bluetooth),
        imagenUrl: imagenParaBackend,
      });
    } else if (p.tipo === 'SoporteCelular') {
      obs = this.catalogoService.crearSoporteCelular({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        tipoSujecion: p.tipoSujecion.trim() || 'Manubrio',
        imagenUrl: imagenParaBackend,
      });
    } else {
      obs = this.catalogoService.crearVisor({
        marcaId,
        marcaNombre: p.marcaNombre.trim(),
        precioMonto: Number(p.precioMonto),
        precioMoneda,
        color: p.color.trim(),
        tipoVisor: p.tipoVisor.trim() || 'Transparente',
        modelosCascoCompatibles: ['AGV K3', 'AGV K1', 'LS2 Stream'],
        imagenUrl: imagenParaBackend,
      });
    }

    obs.subscribe({
      next: (creado) => {
        // Guardamos la imagen localmente
        const imagenGuardada = this.nuevoProducto.imagenUrl || imagenFinal;
        this.imagenesService.guardarImagen(creado.id, imagenGuardada);

        // PUBLICACIÓN AUTOMÁTICA INMEDIATA:
        // Los productos en el backend nacen en estado NO_PUBLICADO. Al publicar inmediatamente,
        // el producto pasa a PUBLICADO y aparece de inmediato en el catálogo como DISPONIBLE.
        this.catalogoService.publicar(creado.id).subscribe({
          next: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.mensaje.set(`¡Producto "${p.marcaNombre} ${p.tipo}" creado y disponible en catálogo!`);
            this.cargarProductos(0);
            setTimeout(() => this.mensaje.set(null), 5000);
          },
          error: () => {
            this.guardandoProducto.set(false);
            this.cerrarModalCrear();
            this.mensaje.set(`¡Producto "${p.marcaNombre} ${p.tipo}" creado exitosamente!`);
            this.cargarProductos(0);
            setTimeout(() => this.mensaje.set(null), 5000);
          },
        });
      },
      error: (err) => {
        this.guardandoProducto.set(false);
        const detalle = err.error?.mensaje || err.error?.message || err.message || 'Error de validación';
        this.error.set('Error al crear producto: ' + detalle);
      },
    });
  }
}
