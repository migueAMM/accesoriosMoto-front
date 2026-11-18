import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvisosService, Aviso } from '../../servicios/avisos';

@Component({
  selector: 'app-avisos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avisos.html',
  styleUrl: './avisos.css',
})
export class Avisos {
  public avisosService = inject(AvisosService);

  cerrar(id: string): void {
    this.avisosService.cerrar(id);
  }
}
