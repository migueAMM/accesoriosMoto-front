import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../../servicios/catalogo';
import { AuthService } from '../../servicios/auth';
import { ProductoResponse } from '../../modelos/catalogo';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {
  private catalogoService = inject(CatalogoService);
  public authService = inject(AuthService);

  destacados = signal<ProductoResponse[]>([]);
  cargando = signal<boolean>(false);

  // Categorías de compra rápida tipo Inducascos
  tiposCasco = [
    { nombre: 'INTEGRAL', icono: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=300&q=80', tag: 'Máxima Seguridad' },
    { nombre: 'MODULAR', icono: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=300&q=80', tag: 'Touring & Ciudad' },
    { nombre: 'ABIERTO', icono: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=300&q=80', tag: 'Clásico & Urbano' },
    { nombre: 'OFF-ROAD', icono: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=300&q=80', tag: 'Enduro & Cross' },
    { nombre: 'DUAL SPORT', icono: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=300&q=80', tag: 'Aventura Total' },
  ];

  marcas = ['AGV', 'LS2', 'ALPINESTARS', 'DAINESE', 'GIVI', 'CARDO', 'QUAD LOCK'];

  ngOnInit(): void {
    this.cargando.set(true);
    this.catalogoService.listar({ pagina: 0, tamano: 4 }).subscribe({
      next: (resp) => {
        this.destacados.set(resp.content);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  obtenerImagen(prod: ProductoResponse): string {
    const tipo = prod.tipo?.toLowerCase() || '';
    if (tipo.includes('casco')) {
      return prod.color?.toLowerCase().includes('blanco')
        ? 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80';
    }
    if (tipo.includes('chaqueta')) return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80';
    if (tipo.includes('guantes')) return 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80';
    if (tipo.includes('baul')) return 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80';
    return 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80';
  }
}
