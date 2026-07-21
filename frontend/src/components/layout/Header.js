import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../App";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const { user, logout, isAuthenticated, isAdmin, isStaff } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2"
            data-testid="logo-link"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-xl font-bold gradient-text">Glow Beauty</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/services"
              className={`font-medium transition-colors ${
                isActive('/services') 
                  ? 'text-purple-600' 
                  : 'text-gray-700 hover:text-purple-600'
              }`}
              data-testid="services-nav-link"
            >
              Services
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/booking"
                  className={`font-medium transition-colors ${
                    isActive('/booking') 
                      ? 'text-purple-600' 
                      : 'text-gray-700 hover:text-purple-600'
                  }`}
                  data-testid="booking-nav-link"
                >
                  Book Appointment
                </Link>

                <Link
                  to="/dashboard"
                  className={`font-medium transition-colors ${
                    isActive('/dashboard') 
                      ? 'text-purple-600' 
                      : 'text-gray-700 hover:text-purple-600'
                  }`}
                  data-testid="dashboard-nav-link"
                >
                  Dashboard
                </Link>

                {(isAdmin || isStaff) && (
                  <>
                    <Link
                      to="/admin"
                      className={`font-medium transition-colors ${
                        location.pathname.startsWith('/admin') 
                          ? 'text-purple-600' 
                          : 'text-gray-700 hover:text-purple-600'
                      }`}
                      data-testid="admin-nav-link"
                    >
                      Admin
                    </Link>
                    
                    <Link
                      to="/admin/forms"
                      className={`font-medium transition-colors ${
                        isActive('/admin/forms') 
                          ? 'text-purple-600' 
                          : 'text-gray-700 hover:text-purple-600'
                      }`}
                      data-testid="forms-nav-link"
                    >
                      Forms
                    </Link>

                    <Link
                      to="/admin/marketing"
                      className={`font-medium transition-colors ${
                        isActive('/admin/marketing') 
                          ? 'text-purple-600' 
                          : 'text-gray-700 hover:text-purple-600'
                      }`}
                      data-testid="marketing-nav-link"
                    >
                      Marketing
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link to="/login">
                  <Button variant="ghost" data-testid="login-btn">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700" data-testid="register-btn">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu-trigger">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm">
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{user.first_name} {user.last_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" data-testid="profile-menu-item">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" data-testid="dashboard-menu-item">
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  {(isAdmin || isStaff) && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" data-testid="admin-menu-item">
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/forms" data-testid="forms-menu-item">
                          Consultation Forms
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/marketing" data-testid="marketing-menu-item">
                          Marketing Campaigns
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="logout-menu-item">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="mobile-menu-button"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 animate-fade-in" data-testid="mobile-menu">
            <div className="flex flex-col space-y-4">
              <Link
                to="/services"
                className="font-medium text-gray-700 hover:text-purple-600 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Services
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/booking"
                    className="font-medium text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Book Appointment
                  </Link>
                  <Link
                    to="/dashboard"
                    className="font-medium text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="font-medium text-gray-700 hover:text-purple-600 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {(isAdmin || isStaff) && (
                    <Link
                      to="/admin"
                      className="font-medium text-gray-700 hover:text-purple-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;