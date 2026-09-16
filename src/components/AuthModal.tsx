import React, { useState, FormEvent } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { Shield, Lock, Mail, User as UserIcon, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: User) => void;
  onSuccess?: (user: User) => void;
  currentBusinessId?: string;
  businessId?: string;
  allowSuperAdminQuickLogin?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onSuccess,
  currentBusinessId,
  businessId,
  allowSuperAdminQuickLogin = false,
}: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('business_owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const notifySuccess = (user: User) => {
    if (onLoginSuccess) onLoginSuccess(user);
    if (onSuccess) onSuccess(user);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();
    const isSuperAdminEmail = cleanEmail.toLowerCase() === 'agenciaclienteya@gmail.com' || cleanEmail.toLowerCase().includes('admin');

    if (isSuperAdminEmail && password && password !== 'admin123') {
      setError('Contraseña incorrecta para SuperAdmin Master.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const user = await api.register({
          name,
          email: cleanEmail,
          password,
          role,
          businessId: role === 'superadmin' ? null : currentBusinessId || businessId || 'biz_turnosmed_demo',
        });
        notifySuccess(user);
      } else {
        const user = await api.login(cleanEmail, password || 'admin123');
        notifySuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              TM
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {isRegister ? 'Crear Cuenta' : 'Acceso al Consultorio'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isRegister ? 'Registra tu consultorio o perfil' : 'Ingresa con tu correo y contraseña'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {allowSuperAdminQuickLogin && !isRegister && (
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-amber-900 text-[11px]">Acceso Rápido SuperAdmin</div>
                  <div className="text-[10px] text-amber-700">agenciaclienteya@gmail.com</div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const u = await api.login('agenciaclienteya@gmail.com', 'admin123');
                    notifySuccess(u);
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer transition shadow-xs"
              >
                Autologuear
              </button>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-teal-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-teal-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Cuenta</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-teal-500"
              >
                <option value="business_owner">Dueño de Negocio / Prestador</option>
                <option value="staff">Profesional / Médico / Staff</option>
                <option value="customer">Paciente / Cliente</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition mt-2 cursor-pointer shadow-sm"
          >
            {loading ? 'Validando credenciales...' : isRegister ? 'Crear Cuenta' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="text-center mt-4 text-xs text-slate-600">
          {isRegister ? (
            <span>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="font-bold text-teal-700 hover:underline cursor-pointer"
              >
                Iniciar sesión
              </button>
            </span>
          ) : (
            <span>
              ¿Nuevo en TurnosDisponibles?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="font-bold text-teal-700 hover:underline cursor-pointer"
              >
                Registrar mi negocio
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
