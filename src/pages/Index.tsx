import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Code, Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="flex items-center justify-center mb-8">
          <Code className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">CodeSave</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Organize e gerencie seus snippets de código em um só lugar
        </p>
        <Button onClick={() => navigate('/auth')} size="lg">
          Começar Agora
        </Button>
      </div>
    </div>
  );
};

export default Index;
