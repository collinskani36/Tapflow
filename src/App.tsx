// src/App.tsx (update with new routes)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CustomerProvider } from "@/context/CustomerContext";
import { NetworkGuard } from "@/components/NetworkGuard";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import ShopPage from "./pages/ShopPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentPage from "./pages/PaymentPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound.tsx";
import ProtectedRoute from "@/components/ProtectedRoute";

// Rider pages
import RiderDashboard from "@/pages/rider/Dashboard";
import RiderHistory from "@/pages/rider/HistoryPage";
import RiderProfile from "@/pages/rider/ProfilePage";

const queryClient = new QueryClient();

const AppInner = () => {
  usePushNotifications();

  return (
    <NetworkGuard>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          
          {/* Admin route - protected */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Rider routes - protected */}
          <Route 
            path="/rider/dashboard" 
            element={
              <ProtectedRoute allowedRole="rider">
                <RiderDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rider/history" 
            element={
              <ProtectedRoute allowedRole="rider">
                <RiderHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rider/profile" 
            element={
              <ProtectedRoute allowedRole="rider">
                <RiderProfile />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </NetworkGuard>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CustomerProvider>
          <CartProvider>
            <AppInner />
          </CartProvider>
        </CustomerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;