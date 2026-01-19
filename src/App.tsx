import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BusinessProvider } from "@/hooks/useBusiness";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { RoleProvider } from "@/hooks/useRole";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import ClientNav from "@/components/ClientNav";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import Sales from "@/pages/Sales";
import NewSale from "@/pages/NewSale";
import Customers from "@/pages/Customers";
import Settings from "@/pages/Settings";
import Subscription from "@/pages/Subscription";
import Catalogue from "@/pages/Catalogue";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BusinessProvider>
            <SubscriptionProvider>
              <RoleProvider>
                <Routes>
                  <Route path="/" element={<Catalogue />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/catalogue" element={<Catalogue />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/products" element={
                    <ProtectedRoute>
                      <Products />
                    </ProtectedRoute>
                  } />
                  <Route path="/products/new" element={
                    <ProtectedRoute>
                      <ProductForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/products/:id" element={
                    <ProtectedRoute>
                      <ProductForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/sales" element={
                    <ProtectedRoute>
                      <Sales />
                    </ProtectedRoute>
                  } />
                  <Route path="/sales/new" element={
                    <ProtectedRoute>
                      <NewSale />
                    </ProtectedRoute>
                  } />
                  <Route path="/customers" element={
                    <ProtectedRoute>
                      <Customers />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/subscription" element={
                    <ProtectedRoute>
                      <Subscription />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <BottomNav />
                <ClientNav />
              </RoleProvider>
            </SubscriptionProvider>
          </BusinessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
