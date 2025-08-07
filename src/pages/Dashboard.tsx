import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import SnippetCard from '@/components/SnippetCard';
import SnippetForm from '@/components/SnippetForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Filter, X } from 'lucide-react';
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
  id_snippet: number;
  titulo: string;
  descricao?: string;
  codigo: string;
  criado_em: string;
  id_linguagem: number;
  linguagens: Language;
  snippet_tags: { tags: Tag }[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filteredSnippets, setFilteredSnippets] = useState<Snippet[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [snippets, searchTerm, selectedLanguage, selectedTags]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSnippets(),
        loadLanguages(),
        loadTags()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSnippets = async () => {
    try {
      const { data, error } = await supabase
        .from('snippets')
        .select(`
          *,
          linguagens (id_linguagem, nome),
          snippet_tags (
            tags (id_tag, nome)
          )
        `)
        .eq('id_usuario', parseInt(user!.id))
        .order('criado_em', { ascending: false });
      
      if (error) throw error;
      setSnippets(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar snippets',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

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

  const applyFilters = () => {
    let filtered = [...snippets];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(snippet =>
        snippet.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snippet.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por linguagem
    if (selectedLanguage && selectedLanguage !== 'all') {
      filtered = filtered.filter(snippet =>
        snippet.id_linguagem === parseInt(selectedLanguage)
      );
    }

    // Filtro por tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(snippet =>
        selectedTags.every(selectedTag =>
          snippet.snippet_tags.some(st => st.tags.id_tag === selectedTag.id_tag)
        )
      );
    }

    setFilteredSnippets(filtered);
  };

  const handleEdit = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      // Deletar relacionamentos de tags primeiro
      await supabase
        .from('snippet_tags')
        .delete()
        .eq('id_snippet', id);

      // Deletar snippet
      const { error } = await supabase
        .from('snippets')
        .delete()
        .eq('id_snippet', id);

      if (error) throw error;

      toast({
        title: 'Snippet excluído',
        description: 'O snippet foi removido com sucesso'
      });

      loadSnippets();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSnippet(null);
  };

  const handleFormSave = () => {
    loadSnippets();
  };

  const addTagFilter = (tag: Tag) => {
    if (!selectedTags.find(t => t.id_tag === tag.id_tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTagFilter = (tagId: number) => {
    setSelectedTags(selectedTags.filter(tag => tag.id_tag !== tagId));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLanguage('all');
    setSelectedTags([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando seus snippets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Meus Snippets</h1>
            <p className="text-muted-foreground">
              {filteredSnippets.length} de {snippets.length} snippets
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="mt-4 md:mt-0">
            <Plus className="mr-2 h-4 w-4" />
            Novo Snippet
          </Button>
        </div>

        {/* Filtros */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, descrição ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por linguagem */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Todas as linguagens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as linguagens</SelectItem>
                {languages.map((language) => (
                  <SelectItem key={language.id_linguagem} value={language.id_linguagem.toString()}>
                    {language.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Botão limpar filtros */}
            {(searchTerm || selectedLanguage !== 'all' || selectedTags.length > 0) && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Tags selecionadas */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground flex items-center">
                <Filter className="mr-1 h-3 w-3" />
                Filtros:
              </span>
              {selectedTags.map((tag) => (
                <Badge key={tag.id_tag} variant="secondary" className="flex items-center gap-1">
                  {tag.nome}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTagFilter(tag.id_tag)}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Tags disponíveis para filtro */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              {allTags
                .filter(tag => !selectedTags.find(st => st.id_tag === tag.id_tag))
                .slice(0, 10)
                .map((tag) => (
                <Badge 
                  key={tag.id_tag} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => addTagFilter(tag)}
                >
                  {tag.nome}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Lista de snippets */}
        {filteredSnippets.length === 0 ? (
          <div className="text-center py-12">
            {snippets.length === 0 ? (
              <div>
                <p className="text-xl font-semibold mb-2">Nenhum snippet ainda</p>
                <p className="text-muted-foreground mb-6">
                  Comece criando seu primeiro snippet de código
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Snippet
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-xl font-semibold mb-2">Nenhum resultado encontrado</p>
                <p className="text-muted-foreground">
                  Tente ajustar os filtros ou termos de busca
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSnippets.map((snippet) => (
              <SnippetCard
                key={snippet.id_snippet}
                snippet={snippet}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Formulário de snippet */}
      <SnippetForm
        open={showForm}
        onOpenChange={handleFormClose}
        snippet={editingSnippet}
        onSave={handleFormSave}
      />
    </div>
  );
};

export default Dashboard;