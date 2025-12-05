import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/common/Navbar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { UploadPage } from './pages/UploadPage';
import { WebhooksPage } from './pages/WebhooksPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/webhooks" element={<WebhooksPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
