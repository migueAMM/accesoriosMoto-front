import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './servicios/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  public authService = inject(AuthService);
  private router = inject(Router);

  // Control del Mega Menú
  menuAbierto = signal<string | null>(null);

  // Buscador integrado en el header
  busquedaHeader = '';
  buscadorVisible = signal<boolean>(false);

  abrirMenu(menu: string): void {
    this.menuAbierto.set(menu);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(null);
  }

  toggleBuscador(): void {
    this.buscadorVisible.update((v) => !v);
  }

  buscar(): void {
    if (this.busquedaHeader.trim()) {
      const q = this.busquedaHeader.trim();
      this.busquedaHeader = '';
      this.buscadorVisible.set(false);
      this.cerrarMenu();
      this.router.navigate(['/catalogo'], { queryParams: { q } });
    }
  }

  navegarACatalogo(params: Record<string, string>): void {
    this.cerrarMenu();
    this.router.navigate(['/catalogo'], { queryParams: params });
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
