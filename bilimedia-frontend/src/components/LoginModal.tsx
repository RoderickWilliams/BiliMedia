import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../services/auth';

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  if (!showLoginModal) return null;

  const reset = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setErr('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    closeLoginModal();
  };

  const handleSubmit = async () => {
    setErr('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, email, password);
      if (!result.ok) {
        setErr(result.message);
      } else {
        reset();
      }
    } catch (e: any) {
      setErr(e?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗 */}
      <div className="relative w-[420px] max-w-[92vw] rounded-2xl bg-white shadow-2xl overflow-hidden fade-up">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[18px] font-semibold text-gray-800">
            {mode === 'login' ? '登录 BiliMedia' : '注册账号'}
          </h2>
          <button
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
            onClick={handleClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <div className="px-6 py-5 space-y-4">
          {/* 用户名 */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">用户名</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* 邮箱（仅注册） */}
          {mode === 'register' && (
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">邮箱</label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          )}

          {/* 密码 */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">密码</label>
            <input
              type="password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              placeholder={mode === 'login' ? '请输入密码' : '至少 4 位字符'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* 错误提示 */}
          {err && (
            <div className="text-[13px] text-red-500 bg-red-50 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            className="w-full py-2.5 rounded-lg text-white font-medium text-[14px] transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'var(--gradient-primary)' }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="spin" />}
            {mode === 'login' ? '登录' : '注册并登录'}
          </button>

          {/* 切换模式 */}
          <div className="text-center text-[13px] text-gray-500">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button
                  className="text-indigo-500 hover:underline ml-1"
                  onClick={() => { setMode('register'); setErr(''); }}
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button
                  className="text-indigo-500 hover:underline ml-1"
                  onClick={() => { setMode('login'); setErr(''); }}
                >
                  立即登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
