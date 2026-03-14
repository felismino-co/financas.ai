import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ComingSoonPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <p className="text-4xl mb-4">🚧</p>
      <h2 className="text-lg font-semibold text-foreground mb-2">Em desenvolvimento</h2>
      <p className="text-sm text-muted-foreground mb-6">Disponível em breve!</p>
      <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft size={16} /> Voltar
      </Button>
    </div>
  );
}
