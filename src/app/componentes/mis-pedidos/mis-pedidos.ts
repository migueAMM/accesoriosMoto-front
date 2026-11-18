import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ComprasService } from '../../servicios/compras';
import { AuthService } from '../../servicios/auth';
import { AvisosService } from '../../servicios/avisos';
import { PedidoResponse } from '../../modelos/compras';

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mis-pedidos.html',
  styleUrl: './mis-pedidos.css',
})
export class MisPedidos implements OnInit {
  private comprasService = inject(ComprasService);
  public authService = inject(AuthService);
  private avisosService = inject(AvisosService);

  pedidos = signal<PedidoResponse[]>([]);
  cargando = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.comprasService.listarMisPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        const mensaje = this.avisosService.traducirErrorHttp(
          err.status,
          'No se pudieron cargar los pedidos del servidor.'
        );
        this.error.set(mensaje);
        this.avisosService.error(mensaje);
      },
    });
  }
}
