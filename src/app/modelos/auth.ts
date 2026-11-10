export interface LoginRequest {
  correo: string;
  contrasena: string;
}

export interface RegistrarCompradorRequest {
  nombre: string;
  correo: string;
  contrasena: string;
}

export interface TokenResponse {
  token: string;
  type: string;
  expireAt: string;
  roles: string[];
}

export interface UsuarioResponse {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
}

export interface UsuarioSesion {
  id: string;
  correo: string;
  rol: string;
  token: string;
  nombre?: string;
}
