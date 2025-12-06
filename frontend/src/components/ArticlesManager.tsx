import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from './ui/Toast';
import { Trash2, Plus, Download, Upload, Search, Edit } from 'lucide-react';
import { SubConfigModal } from './SubConfigModal';
import { ImportResultModal } from './ImportResultModal';

interface Article {
    id: number;
    article_number: string;
    product_id: string;
    selected_options: Record<string, any>;
}

export function ArticlesManager() {
    const [articles, setArticles] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [editingArticle, setEditingArticle] = useState<Article | null>(null);
    const [importResult, setImportResult] = useState<{ created: number, updated: number, failed: number } | null>(null);

    const toast = useToast();
    const [formData, setFormData] = useState<Partial<Article>>({
        article_number: '',
        product_id: '',
        selected_options: {}
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [artData, prodData] = await Promise.all([
                api.articles.list(),
                api.products.list()
            ]);
            setArticles(artData);
            setProducts(prodData);
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load articles/products.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData({ article_number: '', product_id: '', selected_options: {} });
        setIsCreating(true);
        setEditingArticle(null);
    };

    const handleEdit = (article: Article) => {
        setFormData({
            article_number: article.article_number,
            product_id: article.product_id,
            selected_options: article.selected_options
        });
        setEditingArticle(article);
        setIsCreating(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this article?")) return;
        try {
            await api.articles.delete(id);
            setArticles(articles.filter(a => a.id !== id));
            toast.success("Article deleted.");
        } catch (error) {
            console.error("Failed to delete article", error);
            toast.error("Failed to delete article.");
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.article_number || !formData.product_id) {
                toast.error("Article Number and Product are required.");
                return;
            }

            if (editingArticle) {
                const updated = await api.articles.update(editingArticle.id, formData);
                setArticles(articles.map(a => a.id === updated.id ? updated : a));
                toast.success("Article updated.");
            } else {
                const created = await api.articles.create(formData);
                setArticles([...articles, created]);
                toast.success("Article created.");
            }
            setIsCreating(false);
            setEditingArticle(null);
        } catch (error: any) {
            console.error("Failed to save article", error);
            // Try to extract error message from API response if possible, simplified here
            toast.error("Failed to save article. Check article number uniqueness or valid options.");
        }
    };

    const handleExport = async () => {
        try {
            const blob = await api.articles.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `articles_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success("Export started.");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Export failed.");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const summary = await api.articles.import(file);

            // Check and set state for modal
            if (summary && typeof summary.created === 'number') {
                setImportResult({
                    created: summary.created,
                    updated: summary.updated,
                    failed: summary.failed
                });

                // User Request: Add debugging info to console
                if (summary.failed > 0 && summary.errors) {
                    console.group("Import Failures Debug Info");
                    console.warn(`Encountered ${summary.failed} failures during import.`);
                    console.table(summary.errors); // Nicely formatted table of errors
                    console.groupEnd();
                }
            } else {
                toast.success("Import successful.");
            }
            loadData();
        } catch (error) {
            console.error("Import failed", error);
            toast.error("Import failed check console or network tab.");
        }
        e.target.value = ''; // Reset input
    };

    // --- Render Helpers ---
    const selectedProduct = products.find(p => p.id === formData.product_id);

    const renderOptionInputs = () => {
        if (!selectedProduct || !selectedProduct.options) return null;

        return (
            <div className="space-y-4 border p-4 rounded-lg bg-slate-50 mt-4">
                <h4 className="font-semibold text-sm uppercase text-slate-500">Configuration Options</h4>
                {selectedProduct.options.map((opt: any) => (
                    <div key={opt.id}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {opt.name}
                        </label>
                        {opt.type === 'select' ? (
                            <select
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                value={formData.selected_options?.[opt.id] || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    selected_options: { ...formData.selected_options, [opt.id]: e.target.value }
                                })}
                            >
                                <option value="">- Select -</option>
                                {opt.choices.map((c: any) => (
                                    <option key={c.value} value={c.value}>
                                        {c.name || c.value}
                                    </option>
                                ))}
                            </select>
                        ) : opt.type === 'boolean' ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.selected_options?.[opt.id] || false}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        selected_options: { ...formData.selected_options, [opt.id]: e.target.checked }
                                    })}
                                    className="rounded border-slate-300"
                                />
                                <span className="text-sm text-slate-600">Enabled</span>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    };

    const filteredArticles = articles.filter(a =>
        a.article_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.product_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search Articles..."
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <Upload size={18} />
                        Import
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-duagon-blue text-white px-4 py-2 rounded-lg hover:bg-duagon-blue/90 transition-colors"
                    >
                        <Plus size={18} />
                        Add Article
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-6 py-3 font-medium">Article Number</th>
                            <th className="px-6 py-3 font-medium">Product ID</th>
                            <th className="px-6 py-3 font-medium">Configuration</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : filteredArticles.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No articles found.</td></tr>
                        ) : (
                            filteredArticles.map(article => (
                                <tr key={article.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-medium text-slate-900">{article.article_number}</td>
                                    <td className="px-6 py-3 text-slate-600">{article.product_id}</td>
                                    <td className="px-6 py-3 text-slate-600">
                                        {Object.entries(article.selected_options).map(([k, v]) => (
                                            <span key={k} className="inline-block bg-slate-100 px-2 py-0.5 rounded text-xs mr-1 text-slate-500">
                                                {k}: {String(v)}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(article)} className="p-1 text-duagon-blue hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(article.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            <SubConfigModal
                isOpen={isCreating}
                onClose={() => setIsCreating(false)}
                onSave={handleSave}
                title={editingArticle ? "Edit Article" : "Create New Article"}
                saveLabel="Save Article"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Article Number
                        </label>
                        <input
                            type="text"
                            value={formData.article_number}
                            onChange={(e) => setFormData({ ...formData, article_number: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. G25A-16GB-3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Product
                        </label>
                        <select
                            value={formData.product_id}
                            onChange={(e) => setFormData({ ...formData, product_id: e.target.value, selected_options: {} })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                            <option value="">- Select Product -</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                            ))}
                        </select>
                    </div>

                    {renderOptionInputs()}
                </div>
            </SubConfigModal>
            {/* Import Result Modal */}
            <ImportResultModal
                isOpen={!!importResult}
                onClose={() => setImportResult(null)}
                results={importResult}
                title="Article Import Result"
            />
        </div>
    );
}
