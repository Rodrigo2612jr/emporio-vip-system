import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { Upload, Search, Trash2, Film, ImageIcon, X } from 'lucide-react';

const mediaCategories = [
  { value: 'video_produto', label: 'Vídeos de Produto' },
  { value: 'video_receita', label: 'Vídeos de Receita' },
  { value: 'bastidor', label: 'Bastidores' },
  { value: 'foto_kit', label: 'Fotos de Kits' },
  { value: 'foto_produto', label: 'Fotos de Produtos' },
  { value: 'material_feed', label: 'Materiais de Feed' },
  { value: 'material_story', label: 'Materiais de Story' },
  { value: 'video_explicativo', label: 'Vídeos Explicativos' },
  { value: 'video_tutorial', label: 'Vídeos de Tutorial' },
  { value: 'institucional', label: 'Institucionais' },
];

export default function MediaLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState({ category: '', search: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('foto_produto');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get('/media', { params: { category: filter.category || undefined, search: filter.search || undefined } })
      .then(res => setItems(res.data));
  };

  useEffect(() => { load(); }, [filter]);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', uploadCategory);
        await api.post('/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      load();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta mídia?')) return;
    await api.delete(`/media/${id}`);
    load();
  };

  const isVideo = (mime: string) => mime.startsWith('video/');
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Biblioteca de Mídias</h1>
          <p className="text-gray-500">Imagens e vídeos para suas campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            {mediaCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50">
            <Upload size={18} /> {uploading ? 'Enviando...' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
            onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar por nome..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas categorias</option>
          {mediaCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition group">
            <div className="aspect-square bg-gray-100 relative">
              {isVideo(item.mimeType) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={40} className="text-gray-300" />
                </div>
              ) : (
                <img src={item.url} alt={item.originalName} className="w-full h-full object-cover" />
              )}
              <button onClick={() => remove(item.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition">
                <Trash2 size={14} />
              </button>
              <div className="absolute bottom-2 left-2">
                <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full">
                  {mediaCategories.find(c => c.value === item.category)?.label || item.category}
                </span>
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs text-gray-700 truncate">{item.originalName}</p>
              <p className="text-[10px] text-gray-400">{formatSize(item.size)}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
            Nenhuma mídia encontrada
          </div>
        )}
      </div>
    </div>
  );
}
