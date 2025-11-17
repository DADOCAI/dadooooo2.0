import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logoDefault from 'figma:asset/cb7518acee88e4f203be6734e15429ff9c58e4e1.png';
import logoHover from 'figma:asset/e5c375aeb9d5459e76d1f4b4579b4d2ffbb0055e.png';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, userEmail, logout, setShowLoginDialog } = useAuth();

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      navigate('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
      <nav className="px-8 py-6">
        <div className="flex justify-between items-center">
          <div 
            className="relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleLogoClick}
          >
            <img 
              src={isHovered ? logoHover : logoDefault}
              alt="dado logo"
              className={`h-14 object-contain transition-opacity duration-300 ${
                isHovered ? 'animate-flicker' : ''
              }`}
            />
          </div>
          <div className="flex gap-12 text-black text-sm">
            <Link to="/" className="hover:opacity-60 transition-opacity">
              工具
            </Link>
            <Link to="/about" className="hover:opacity-60 transition-opacity">
              关于
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span>{(userEmail || '').split('@')[0]}</span>
                <button 
                  onClick={logout}
                  className="hover:opacity-60 transition-opacity"
                >
                  退出登录
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginDialog(true)}
                className="hover:opacity-60 transition-opacity"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}