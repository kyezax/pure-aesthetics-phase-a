import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const ServicesPage = () => {
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get("/services");
      setServices(response.data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "all", name: "All Services" },
    { id: "facial", name: "Facials" },
    { id: "laser_removal", name: "Laser Removal" },
    { id: "teeth_whitening", name: "Teeth Whitening" }
  ];

  const filteredServices = selectedCategory === "all" 
    ? services 
    : services.filter(service => service.category === selectedCategory);

  const getCategoryIcon = (category) => {
    switch (category) {
      case "facial":
        return "✨";
      case "laser_removal":
        return "🔬";
      case "teeth_whitening":
        return "😁";
      default:
        return "💆";
    }
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case "facial":
        return "bg-green-100 text-green-800";
      case "laser_removal":
        return "bg-red-100 text-red-800";
      case "teeth_whitening":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" data-testid="services-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Our Services
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our comprehensive range of professional beauty treatments 
            designed to enhance your natural beauty and confidence.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className={selectedCategory === category.id 
                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" 
                : ""}
              data-testid={`category-filter-${category.id}`}
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service) => (
            <Card 
              key={service.id} 
              className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-0 shadow-lg"
              data-testid={`service-card-${service.id}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4"
                    style={{ 
                      backgroundColor: service.color_code + "20",
                      color: service.color_code 
                    }}
                  >
                    {getCategoryIcon(service.category)}
                  </div>
                  <Badge 
                    className={getCategoryBadgeColor(service.category)}
                    data-testid={`service-category-${service.id}`}
                  >
                    {service.category.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                  {service.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.description}
                </p>
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-3xl font-bold text-gray-800">
                      ${(service.price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-semibold text-gray-700">
                      {service.duration_minutes} minutes
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {isAuthenticated ? (
                    <Button 
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={() => window.location.href = `/booking?service=${service.id}`}
                      data-testid={`book-service-${service.id}`}
                    >
                      Book This Service
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={() => window.location.href = "/register"}
                      data-testid={`register-to-book-${service.id}`}
                    >
                      Sign Up to Book
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No services found in this category.
            </p>
          </div>
        )}

        {/* CTA Section */}
        {!isAuthenticated && (
          <div className="mt-16 bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Ready to Transform Your Look?
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Join thousands of satisfied clients who have experienced our premium beauty services. 
              Create your account today and book your first appointment.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-8 py-3"
                onClick={() => window.location.href = "/register"}
                data-testid="cta-register-btn"
              >
                Create Account
              </Button>
              <Button 
                size="lg"
                variant="outline" 
                className="px-8 py-3"
                onClick={() => window.location.href = "/login"}
                data-testid="cta-login-btn"
              >
                Already a Member?
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;