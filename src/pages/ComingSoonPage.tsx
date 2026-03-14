import { Construction } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <Construction size={48} className="text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold text-foreground mb-2">Em desenvolvimento</h2>
      <p className="text-sm text-muted-foreground">Disponível em breve</p>
    </div>
  );
}
