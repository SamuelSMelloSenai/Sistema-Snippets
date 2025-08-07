import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { X, Plus, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/hooks/use-toast';

interface Language {
  id_linguagem: number;
  nome: string;
}

interface Tag {
  id_tag: number;
  nome: string;
}

interface Snippet {
  id_snippet?: number;
  titulo: string;
  descricao?: string;
  codigo: string;
  id_linguagem: number;
  linguagens?: Language;
  snippet_tags?: { tags: Tag }[];
}

interface SnippetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: Snippet | null;
  onSave: () => void;
}

const SnippetForm = ({ open, onOpenChange, snippet, onSave }: SnippetFormProps) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    codigo: '',
    id_linguagem: 0
  });

  useEffect(() => {
    if (open) {
      loadLanguages();
      loadTags();
    }
  }, [open]);

  useEffect(() => {
    if (snippet) {
      setFormData({
        titulo: snippet.titulo,
        descricao: snippet.descricao || '',
        codigo: snippet.codigo,
        id_linguagem: snippet.id_linguagem
      });
      setSelectedTags(snippet.snippet_tags?.map(st => st.tags) || []);
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        codigo: '',
        id_linguagem: 0
      });
      setSelectedTags([]);
    }
  }, [snippet]);

  const loadLanguages = async () => {
    try {
      const { data, error } = await supabase
        .from('linguagens')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setLanguages(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar linguagens',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tags',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    
    try {
      // Verifica se a tag já existe
      const existingTag = allTags.find(tag => 
        tag.nome.toLowerCase() === newTag.toLowerCase()
      );
      
      if (existingTag) {
        if (!selectedTags.find(tag => tag.id_tag === existingTag.id_tag)) {
          setSelectedTags([...selectedTags, existingTag]);
        }
        setNewTag('');
        return;
      }
      
      // Cria nova tag
      const { data, error } = await supabase
        .from('tags')
        .insert([{ nome: newTag.trim() }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newTagObj = data as Tag;
      setAllTags([...allTags, newTagObj]);
      setSelectedTags([...selectedTags, newTagObj]);
      setNewTag('');
    } catch (error: any) {
      toast({
        title: 'Erro ao criar tag',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter(tag => tag.id_tag !== tagId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.titulo.trim() || !formData.codigo.trim() || !formData.id_linguagem) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título, código e linguagem',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      if (snippet) {
        // Atualizar snippet existente
        const { error } = await supabase
          .from('snippets')
          .update({
            titulo: formData.titulo,
            descricao: formData.descricao || null,
            codigo: formData.codigo,
            id_linguagem: formData.id_linguagem
          })
          .eq('id_snippet', snippet.id_snippet);
        
        if (error) throw error;
        
        // Atualizar tags
        await supabase
          .from('snippet_tags')
          .delete()
          .eq('id_snippet', snippet.id_snippet);
        
        if (selectedTags.length > 0) {
          const tagInserts = selectedTags.map(tag => ({
            id_snippet: snippet.id_snippet!,
            id_tag: tag.id_tag
          }));
          
          const { error: tagError } = await supabase
            .from('snippet_tags')
            .insert(tagInserts);
          
          if (tagError) throw tagError;
        }
        
        toast({
          title: 'Snippet atualizado!',
          description: 'As alterações foram salvas com sucesso'
        });
      } else {
        // Criar novo snippet
        const { data: snippetData, error } = await supabase
          .from('snippets')
          .insert({
            titulo: formData.titulo,
            descricao: formData.descricao || null,
            codigo: formData.codigo,
            id_linguagem: formData.id_linguagem,
            id_usuario: parseInt(user.id)
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Adicionar tags
        if (selectedTags.length > 0) {
          const tagInserts = selectedTags.map(tag => ({
            id_snippet: snippetData.id_snippet,
            id_tag: tag.id_tag
          }));
          
          const { error: tagError } = await supabase
            .from('snippet_tags')
            .insert(tagInserts);
          
          if (tagError) throw tagError;
        }
        
        toast({
          title: 'Snippet criado!',
          description: 'Seu snippet foi salvo com sucesso'
        });
      }
      
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {snippet ? 'Editar Snippet' : 'Novo Snippet'}
          </DialogTitle>
          <DialogDescription>
            {snippet 
              ? 'Edite as informações do seu snippet de código'
              : 'Adicione um novo snippet de código à sua coleção'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Função para validar email"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linguagem">Linguagem *</Label>
              <Select 
                value={formData.id_linguagem.toString()} 
                onValueChange={(value) => setFormData({ ...formData, id_linguagem: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a linguagem" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.id_linguagem} value={language.id_linguagem.toString()}>
                      {language.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva brevemente o que este código faz..."
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <Badge key={tag.id_tag} variant="secondary" className="flex items-center gap-1">
                  {tag.nome}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag.id_tag)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar nova tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="codigo">Código *</Label>
            <Textarea
              id="codigo"
              placeholder="Cole ou digite seu código aqui..."
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              rows={10}
              className="font-mono text-sm"
              required
            />
          </div>
          
          {formData.codigo && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg overflow-hidden">
                <SyntaxHighlighter
                  language={languages.find(l => l.id_linguagem === formData.id_linguagem)?.nome.toLowerCase() || 'javascript'}
                  style={theme === 'dark' ? oneDark : oneLight}
                  customStyle={{
                    margin: 0,
                    fontSize: '0.875rem',
                    maxHeight: '300px'
                  }}
                  showLineNumbers
                >
                  {formData.codigo}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
        </form>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {snippet ? 'Atualizar' : 'Criar'} Snippet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SnippetForm;