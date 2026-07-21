import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import "./App.css";

// Import components
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import Dashboard from "./components/dashboard/Dashboard";
import BookingCalendar from "./components/booking/BookingCalendar";
import ClientPortal from "./components/client/ClientPortal";
import AdminPanel from "./components/admin/AdminPanel";
import ServicesPage from "./components/services/ServicesPage";
import Header from "./components/layout/Header";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Enhanced Components
import ClientProfileManager from "./components/enhanced/ClientProfileManager";
import EnhancedBookingCalendar from "./components/enhanced/EnhancedBookingCalendar";
import ConsultationFormBuilder from "./components/enhanced/ConsultationFormBuilder";
import MarketingCampaignManager from "./components/enhanced/MarketingCampaignManager";

// Timely-inspired Components
import TimelyDashboard from "./components/timely/TimelyDashboard";

// Phase A: Core Admin Backend (Pure Aesthetics business settings)
import AdminLayout from "./components/admin/settings/AdminLayout";
import AdminDashboard from "./components/admin/settings/AdminDashboard";
import BusinessSettingsPage from "./components/admin/settings/BusinessSettingsPage";
import CategoriesPage from "./components/admin/settings/CategoriesPage";
import ServicesListPage from "./components/admin/settings/ServicesListPage";
import ServiceEditorPage from "./components/admin/settings/ServiceEditorPage";
import PricingDepositsPage from "./components/admin/settings/PricingDepositsPage";
import PoliciesPage from "./components/admin/settings/PoliciesPage";
import ChangeLogPage from "./components/admin/settings/ChangeLogPage";
import { AdminSettingsPlaceholder, HelpPlaceholder } from "./components/admin/settings/Placeholders";

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.baseURL = API;

// Auth context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Set axios token interceptor
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get("/auth/me");
          setUser(response.data);
        } catch (error) {
          console.error("Auth check failed:", error);
          // Clear invalid token
          localStorage.removeItem("token");
          setToken(null);
          toast.error("Session expired. Please login again.");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (credentials) => {
    try {
      const response = await axios.post("/auth/login", credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem("token", access_token);
      setToken(access_token);
      setUser(userData);
      
      toast.success(`Welcome back, ${userData.first_name}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post("/auth/register", userData);
      toast.success("Registration successful! Please login.");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed";
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
  };

  const authValue = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "admin" || user?.role === "staff",
    isClient: user?.role === "client"
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
          <Header />
          <main className="pt-20">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={
                !user ? <LoginForm /> : <Navigate to="/dashboard" replace />
              } />
              <Route path="/register" element={
                !user ? <RegisterForm /> : <Navigate to="/dashboard" replace />
              } />
              <Route path="/services" element={<ServicesPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={
                user ? <Dashboard /> : <Navigate to="/login" replace />
              } />
              <Route path="/booking" element={
                user ? <EnhancedBookingCalendar /> : <Navigate to="/login" replace />
              } />
              <Route path="/profile" element={
                user ? <ClientPortal /> : <Navigate to="/login" replace />
              } />
              <Route path="/profile/:clientId" element={
                user ? <ClientProfileManager /> : <Navigate to="/login" replace />
              } />
              
              {/* Admin/Staff Routes */}
              <Route path="/admin/*" element={
                user && (user.role === "admin" || user.role === "staff") ? 
                <AdminRoutes /> : <Navigate to="/dashboard" replace />
              } />
            </Routes>
          </main>
          <Toaster 
            position="top-right"
            expand={true}
            richColors={true}
          />
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// Admin Routes Component
function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="appointments" element={<AdminPanel />} />
        <Route path="clients" element={<AdminPanel />} />
        <Route path="clients/:clientId" element={<ClientProfileManager />} />
        <Route path="business-settings" element={<BusinessSettingsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="services" element={<ServicesListPage />} />
        <Route path="services/new" element={<ServiceEditorPage />} />
        <Route path="services/:serviceId" element={<ServiceEditorPage />} />
        <Route path="pricing" element={<PricingDepositsPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="change-log" element={<ChangeLogPage />} />
        <Route path="admin-settings" element={<AdminSettingsPlaceholder />} />
        <Route path="help" element={<HelpPlaceholder />} />
        <Route path="forms" element={<ConsultationFormBuilder />} />
        <Route path="marketing" element={<MarketingCampaignManager />} />
        <Route path="settings" element={<Navigate to="/admin/business-settings" replace />} />
      </Route>
    </Routes>
  );
}

// Landing Page Component
function LandingPage() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get("/services");
      setServices(response.data.slice(0, 6)); // Show first 6 services
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100"></div>
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight font-display">
            Glow Beauty
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
              Professional Salon
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Experience luxury beauty treatments with our comprehensive salon management system. 
            Advanced booking, intelligent scheduling, and personalized client care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {!user ? (
              <>
                <button 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  onClick={() => window.location.href = "/register"}
                  data-testid="get-started-btn"
                >
                  Get Started
                </button>
                <button 
                  className="bg-white text-gray-800 px-8 py-4 rounded-full text-lg font-semibold border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-300 shadow-lg"
                  onClick={() => window.location.href = "/services"}
                  data-testid="view-services-btn"
                >
                  View Services
                </button>
              </>
            ) : (
              <button 
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                onClick={() => window.location.href = "/booking"}
                data-testid="book-appointment-btn"
              >
                Book Appointment
              </button>
            )}
          </div>

          {/* Professional Features Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-xl">📅</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Intelligent Booking</h3>
              <p className="text-gray-600 text-sm">Advanced scheduling with buffer times, staff availability, and automated confirmations.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Custom Forms</h3>
              <p className="text-gray-600 text-sm">Dynamic consultation forms, SOAP notes, and comprehensive client profiles.</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white text-xl">💎</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Marketing Automation</h3>
              <p className="text-gray-600 text-sm">Automated email campaigns, SMS reminders, and loyalty point management.</p>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-pink-200 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-30 animate-bounce"></div>
        <div className="absolute top-1/2 left-20 w-16 h-16 bg-blue-200 rounded-full opacity-40"></div>
      </section>

      {/* Color-Coded Services Preview */}
      <section className="py-20 px-6 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4 font-display">
            Color-Coordinated Treatments
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Our intelligent system organizes treatments by category with distinct color coding for easy identification.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="flex items-center mb-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mr-4"
                    style={{ 
                      backgroundColor: service.color_code + "20",
                      border: `2px solid ${service.color_code}`
                    }}
                  >
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: service.color_code }}></div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{service.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{service.category.replace('_', ' ')}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">{service.description}</p>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-gray-800">
                    ${(service.price_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {service.duration_minutes} min
                  </span>
                </div>

                {user && (
                  <button
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-2 px-4 rounded-xl font-medium transition-all duration-300"
                    onClick={() => window.location.href = `/booking?service=${service.id}`}
                  >
                    Book Now
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button 
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
              onClick={() => window.location.href = "/services"}
              data-testid="view-all-services-btn"
            >
              View All Services
            </button>
          </div>
        </div>
      </section>

      {/* Professional Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4 font-display">
            Professional Salon Management
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Everything you need to run a successful beauty salon with advanced features for both clients and staff.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Consultation Forms</h3>
              <p className="text-gray-600 text-sm">Custom intake forms with SOAP notes and medical history tracking.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl">📸</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Client Files</h3>
              <p className="text-gray-600 text-sm">Before/after photos, documents, and treatment records storage.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl">📧</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Marketing Automation</h3>
              <p className="text-gray-600 text-sm">Automated email campaigns, SMS reminders, and follow-ups.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-white text-2xl">💎</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Loyalty Program</h3>
              <p className="text-gray-600 text-sm">Points tracking, rewards, and customer retention tools.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {!user && (
        <section className="py-20 px-6 bg-gradient-to-r from-pink-50 to-purple-50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 font-display">
              Ready to Experience Professional Salon Management?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join our beauty salon and experience the difference professional care makes. 
              Book your consultation today and see why clients love our advanced booking system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                onClick={() => window.location.href = "/register"}
                data-testid="cta-register-btn"
              >
                Create Account
              </button>
              <button 
                className="bg-white text-gray-800 px-8 py-4 rounded-full text-lg font-semibold border-2 border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-300 shadow-lg"
                onClick={() => window.location.href = "/login"}
                data-testid="cta-login-btn"
              >
                Already a Member?
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;