import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Edit, Trash2, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';

interface Tag {
  id_tag: number;
  nome: string;
}

interface Language {
  id_linguagem: number;
  nome: string;
}

interface Snippet {
  id_snippet: number;
  titulo: string;
  descricao?: string;
  codigo: string;
  criado_em: string;
  linguagens: Language;
  snippet_tags: { tags: Tag }[];
}

interface SnippetCardProps {
  snippet: Snippet;
  onEdit: (snippet: Snippet) => void;
  onDelete: (id: number) => void;
}

const SnippetCard = ({ snippet, onEdit, onDelete }: SnippetCardProps) => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCodeExpanded, setIsCodeExpanded] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippet.codigo);
      toast({
        title: 'Código copiado!',
        description: 'O código foi copiado para a área de transferência'
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = () => {
    onDelete(snippet.id_snippet);
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const codePreview = isCodeExpanded 
    ? snippet.codigo 
    : snippet.codigo.split('\n').slice(0, 6).join('\n') + 
      (snippet.codigo.split('\n').length > 6 ? '\n...' : '');

  return (
    <>
      <Card className="group hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{snippet.titulo}</CardTitle>
              {snippet.descricao && (
                <CardDescription className="text-sm">
                  {snippet.descricao}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(snippet)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyToClipboard}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {snippet.linguagens.nome}
              </Badge>
              {snippet.snippet_tags.map(({ tags }) => (
                <Badge key={tags.id_tag} variant="outline" className="text-xs">
                  {tags.nome}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDate(snippet.criado_em)}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="relative">
            <SyntaxHighlighter
              language={snippet.linguagens.nome.toLowerCase()}
              style={theme === 'dark' ? oneDark : oneLight}
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                maxHeight: isCodeExpanded ? 'none' : '200px',
                overflow: 'hidden'
              }}
              showLineNumbers
            >
              {codePreview}
            </SyntaxHighlighter>
            
            {snippet.codigo.split('\n').length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm"
              >
                {isCodeExpanded ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" />
                    Menos
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    Mais
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="mr-1 h-3 w-3" />
              Copiar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(snippet)}>
              <Edit className="mr-1 h-3 w-3" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir snippet</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o snippet "{snippet.titulo}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SnippetCard;