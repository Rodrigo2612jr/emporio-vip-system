import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login, setup } = useAuth();
  const [isSetup, setIsSetup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSetup) {
        await setup(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
      if (err.response?.status === 401 && !isSetup) {
        // Pode ser primeiro acesso
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-green-100 p-3 rounded-xl">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Empório VIP</h1>
            <p className="text-sm text-gray-500">Sistema de Gestão</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSetup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50">
            {loading ? 'Carregando...' : isSetup ? 'Criar Conta Admin' : 'Entrar'}
          </button>
        </form>

        <button onClick={() => { setIsSetup(!isSetup); setError(''); }}
          className="mt-4 w-full text-sm text-gray-500 hover:text-green-600 transition">
          {isSetup ? '← Voltar ao login' : 'Primeiro acesso? Criar conta admin'}
        </button>
      </div>
    </div>
  );
}
