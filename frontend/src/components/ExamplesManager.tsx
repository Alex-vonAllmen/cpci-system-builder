import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SubConfigModal } from './SubConfigModal';
import { useToast } from './ui/Toast';
import { Plus, Trash2, Edit, Download, Upload } from 'lucide-react';

export function ExamplesManager() {
    const [examples, setExamples] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newExample, setNewExample] = useState({
        id: '',
        name: '',
        description: '',
        config_json: '',
        image_url: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
    const [importResult, setImportResult] = useState<{ created: number, updated: number, failed: number, errors: string[] } | null>(null);
    const toast = useToast();

    // ... existing loadExamples ...
    // Reference original lines to avoid rewriting whole file
    const loadExamples = async () => {
        setIsLoading(true);
        try {
            const data = await api.examples.list();
            setExamples(data);
        } catch (error) {
            console.error("Failed to load examples", error);
            toast.error("Failed to load examples.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadExamples();
    }, []);

    const handleSaveExample = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate JSON
            JSON.parse(newExample.config_json);

            const exampleData = {
                id: newExample.id,
                name: newExample.name,
                description: newExample.description,
                config_json: newExample.config_json,
                image_url: newExample.image_url
            };

            if (isEditing) {
                // For edit, we assume ID cannot be changed, or if it is, it's complex.
                // Usually ID is immutable. Let's disable editing ID.
                await api.examples.update(newExample.id, exampleData);
                toast.success("Example updated successfully.");
            } else {
                await api.examples.create(exampleData);
                toast.success("Example created successfully.");
            }

            setIsCreating(false);
            setIsEditing(false);
            loadExamples();
            setNewExample({
                id: '',
                name: '',
                description: '',
                config_json: '',
                image_url: ''
            });
        } catch (error) {
            console.error("Failed to save example", error);
            toast.error("Invalid JSON config or server error (ID might duplicate).");
        }
    };

    const handleEditExample = (example: any) => {
        setNewExample({
            id: example.id,
            name: example.name,
            description: example.description,
            config_json: typeof example.config_json === 'string' ? example.config_json : JSON.stringify(example.config_json, null, 2),
            image_url: example.image_url || ''
        });
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDeleteExample = async (id: string) => {
        try {
            await api.examples.delete(id);
            loadExamples();
            setDeleteConfirmation(null);
            toast.success("Example deleted successfully.");
        } catch (error) {
            console.error('Failed to delete example:', error);
            toast.error("Failed to delete example.");
        }
    };

    const handleExport = async () => {
        try {
            const blob = await api.examples.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `examples_export_${new Date().toISOString().split('T')[0]}.json`;
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
            const result = await api.examples.import(file);
            setImportResult(result);
            loadExamples();
            e.target.value = ''; // Reset input
        } catch (error) {
            console.error("Import failed", error);
            toast.error("Import failed.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Example Configurations</h2>
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
                        onClick={() => {
                            setNewExample({
                                id: '',
                                name: '',
                                description: '',
                                config_json: '',
                                image_url: ''
                            });
                            setIsEditing(false);
                            setIsCreating(true);
                        }}
                        className="flex items-center gap-2 bg-duagon-blue text-white px-4 py-2 rounded-lg hover:bg-duagon-blue/90 transition-colors"
                    >
                        <Plus size={18} />
                        Add Example
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold mb-4">{isEditing ? 'Edit Example' : 'New Example'}</h3>
                    <form onSubmit={handleSaveExample} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Example Number (ID)</label>
                            <input
                                required
                                disabled={isEditing}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${isEditing ? 'bg-slate-100 text-slate-500' : ''}`}
                                value={newExample.id}
                                onChange={e => setNewExample({ ...newExample, id: e.target.value })}
                                placeholder="e.g. EX-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Name</label>
                            <input
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newExample.name}
                                onChange={e => setNewExample({ ...newExample, name: e.target.value })}
                                placeholder="e.g. Basic 3U System"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <input
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newExample.description}
                                onChange={e => setNewExample({ ...newExample, description: e.target.value })}
                                placeholder="Short description for the tile"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Image URL (Optional)</label>
                            <input
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newExample.image_url}
                                onChange={e => setNewExample({ ...newExample, image_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Configuration JSON</label>
                            <textarea
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs h-64"
                                value={newExample.config_json}
                                onChange={e => setNewExample({ ...newExample, config_json: e.target.value })}
                                placeholder="Paste the full configuration JSON here..."
                            />
                            <p className="text-xs text-slate-500">
                                Paste the JSON exported from the Quote page.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-duagon-blue text-white rounded-lg hover:bg-duagon-blue/90">
                                {isEditing ? 'Update Example' : 'Create Example'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Example ID</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Name</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Description</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : examples.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No examples found.</td></tr>
                        ) : (
                            examples.map(example => (
                                <tr key={example.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-sm">{example.id}</td>
                                    <td className="px-6 py-4 text-sm font-medium">{example.name}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{example.description}</td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button
                                            onClick={() => handleEditExample(example)}
                                            className="p-1 text-duagon-blue hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Example"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmation({ id: example.id, name: example.name })}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Example"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <SubConfigModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onSave={() => deleteConfirmation && handleDeleteExample(deleteConfirmation.id)}
                title="Confirm Deletion"
                saveLabel="Delete"
                saveButtonClass="bg-red-600 hover:bg-red-700"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete <strong>{deleteConfirmation?.name}</strong>?
                    </p>
                </div>
            </SubConfigModal>

            {/* Import Summary Modal */}
            <SubConfigModal
                isOpen={!!importResult}
                onClose={() => setImportResult(null)}
                onSave={() => setImportResult(null)}
                title="Import Summary"
                saveLabel="Close"
                saveButtonClass="bg-slate-800 hover:bg-slate-900"
            >
                {importResult && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 p-4 rounded-lg text-center">
                                <span className="block text-2xl font-bold text-green-700">{importResult.created}</span>
                                <span className="text-sm text-green-800">Created</span>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <span className="block text-2xl font-bold text-blue-700">{importResult.updated}</span>
                                <span className="text-sm text-blue-800">Updated</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg text-center">
                                <span className="block text-2xl font-bold text-red-700">{importResult.failed}</span>
                                <span className="text-sm text-red-800">Failed</span>
                            </div>
                        </div>
                        {importResult.errors.length > 0 && (
                            <div className="mt-4 max-h-40 overflow-y-auto">
                                <h4 className="font-semibold text-sm mb-2 text-red-600">Errors:</h4>
                                <ul className="list-disc pl-5 text-sm text-red-600 space-y-1">
                                    {importResult.errors.map((err: string, i: number) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </SubConfigModal>
        </div>
    );
}
