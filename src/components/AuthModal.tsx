import React, { useState, FormEvent } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { Shield, Lock, Mail, User as UserIcon, X, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  currentBusinessId?: string;
  allowSuperAdminQuickLogin?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  currentBusinessId,
  allowSuperAdminQuickLogin = false,
}: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('business_owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoAcc, setShowDemoAcc] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const user = await api.register({
          name,
          email,
          password,
          role,
          businessId: role === 'superadmin' ? null : currentBusinessId || 'biz_demo_01',
        });
        onLoginSuccess(user);
        onClose();
      } else {
        const user = await api.login(email, password);
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(demoEmail, demoPass);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
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

        {/* Regular Login / Register Form FIRST - Professional standard UX */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
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

        {/* Quick Demo Accounts Drawer (Clearly separated & SuperAdmin only if allowed) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowDemoAcc(!showDemoAcc)}
            className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{showDemoAcc ? '▲ Ocultar atajos de prueba' : '🧪 ¿Quieres probar con cuentas demo? Clic aquí'}</span>
          </button>

          {showDemoAcc && (
            <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Atajos de prueba para evaluación (1 Clic):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* STRICT ISOLATION: SuperAdmin button is ONLY available if explicitly on root master or authorized */}
                {allowSuperAdminQuickLogin && (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('agenciaclienteya@gmail.com', 'admin123')}
                    className="p-2 rounded-xl bg-slate-900 text-white font-semibold text-[11px] hover:bg-black transition text-left sm:col-span-2"
                  >
                    👑 SuperAdmin Master (Solo para ti)
                    <span className="block text-[9px] text-teal-400 font-normal">agenciaclienteya@gmail.com</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleQuickLogin('dueno@consultorios.com', 'dueno123')}
                  className="p-2 rounded-xl bg-teal-700 text-white font-semibold text-[11px] hover:bg-teal-800 transition text-left"
                >
                  🏢 Dueño de este Consultorio
                  <span className="block text-[9px] text-teal-200 font-normal">Control total de turnos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('doctora@consultorios.com', 'staff123')}
                  className="p-2 rounded-xl bg-blue-700 text-white font-semibold text-[11px] hover:bg-blue-800 transition text-left"
                >
                  🩺 Médico / Staff
                  <span className="block text-[9px] text-blue-200 font-normal">Agenda médica del día</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('carlos@gmail.com', 'cliente123')}
                  className="p-2 rounded-xl bg-slate-200 text-slate-800 font-semibold text-[11px] hover:bg-slate-300 transition text-left sm:col-span-2"
                >
                  👤 Paciente de prueba
                  <span className="block text-[9px] text-slate-500 font-normal">Ver reservas realizadas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-3 text-xs text-slate-600">
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
