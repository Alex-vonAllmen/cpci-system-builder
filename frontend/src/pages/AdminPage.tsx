import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { SubConfigModal } from '../components/SubConfigModal';
import { ExamplesManager } from '../components/ExamplesManager';
import { ArticlesManager } from '../components/ArticlesManager';
import { useToast } from '../components/ui/Toast'; // Corrected path for useToast
import { Plus, Trash2, Edit, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';

export function AdminPage() {
    const [products, setProducts] = useState<any[]>([]);
    // const [rules, setRules] = useState<any[]>([]); // TODO: Implement rules management
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'rules' | 'examples' | 'articles'>('products');
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null); // For products
    const [importResult, setImportResult] = useState<{ added: number, updated: number } | null>(null);

    const toast = useToast();
    const formRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to form when creating/editing
    useEffect(() => {
        if (isCreating && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isCreating]);

    // Settings management
    useEffect(() => {
        if (activeTab === 'settings') {
            fetchSettings();
        }
    }, [activeTab]);

    const fetchSettings = async () => {
        try {
            const data = await api.settings.list(); // Corrected API call
            const settingsMap: Record<string, string> = {};
            data.forEach((s: any) => settingsMap[s.key] = s.value);
            setSettings(settingsMap);
        } catch (error) {
            console.error("Failed to fetch settings", error);
            toast.error("Failed to load settings.");
        }
    };

    const handleSaveSetting = async (key: string, value: string) => {
        try {
            await api.settings.update(key, value);
            setSettings({ ...settings, [key]: value });
            toast.success("Settings saved!");
        } catch (error) {
            console.error("Failed to save setting", error);
            toast.error("Failed to save setting.");
        }
    };

    // New Product Form State
    const [newProduct, setNewProduct] = useState({
        id: '',
        type: 'cpu',
        name: '',
        description: '',
        power_watts: 0,
        width_hp: 4,
        price_1: 0,
        price_25: 0,
        price_50: 0,
        price_100: 0,
        price_250: 0,
        price_500: 0,
        options: '', // JSON string for editing
        eol_date: '',
        height_u: 0,
        connectors: [] as string[],
        interfaces: [] as { type: string, count: number }[], // Array for form handling
        externalInterfaces: [] as { type: string, connector: string, count: number }[],
        image_url: '',
        url: '',
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const productsData = await api.products.list();
            setProducts(productsData);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error("Failed to load products.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Convert interfaces array to object
            const interfacesObj: Record<string, number> = {};
            newProduct.interfaces.forEach(i => {
                if (i.type && i.count) {
                    interfacesObj[i.type] = i.count;
                }
            });

            const productData = {
                ...newProduct,
                options: newProduct.options ? JSON.parse(newProduct.options) : null,
                interfaces: Object.keys(interfacesObj).length > 0 ? interfacesObj : null,
                external_interfaces: newProduct.externalInterfaces.length > 0 ? newProduct.externalInterfaces : null,
            };

            if (isEditing) {
                await api.products.update(newProduct.id, productData);
            } else {
                await api.products.create(productData);
            }

            setIsCreating(false);
            setIsEditing(false);
            loadData();
            setNewProduct({
                id: '',
                type: 'cpu',
                name: '',
                description: '',
                power_watts: 0,
                width_hp: 4,
                price_1: 0,
                price_25: 0,
                price_50: 0,
                price_100: 0,
                price_250: 0,
                price_500: 0,
                options: '',
                eol_date: '',
                height_u: 0,
                connectors: [],
                interfaces: [],
                externalInterfaces: [],
                image_url: '',
                url: '',
            });
            toast.success(isEditing ? "Product updated successfully." : "Product created successfully.");
        } catch (error) {
            console.error('Failed to save product:', error);
            toast.error('Failed to save product. Check console for details. Ensure Options is valid JSON.');
        }
    };

    const handleEditProduct = (product: any) => {
        // Convert interfaces object to array
        const interfacesArray = product.interfaces
            ? Object.entries(product.interfaces).map(([type, count]) => ({ type, count: Number(count) }))
            : [];

        setNewProduct({
            id: product.id,
            type: product.type,
            name: product.name,
            description: product.description || '',
            power_watts: product.power_watts,
            width_hp: product.width_hp,
            price_1: product.price1,
            price_25: product.price25,
            price_50: product.price50,
            price_100: product.price100,
            price_250: product.price250,
            price_500: product.price500,
            options: product.options ? JSON.stringify(product.options, null, 2) : '',
            eol_date: product.eol_date || '',
            height_u: product.heightU || 0,
            connectors: product.connectors || [],
            interfaces: interfacesArray,
            externalInterfaces: product.externalInterfaces || [],
            image_url: product.image_url || '',
            url: product.url || '',
        });
        setIsEditing(true);
        setIsCreating(true); // Reuse the create modal
    };

    const handleDeleteProduct = async (id: string) => {
        try {
            await api.products.delete(id);
            loadData();
            setDeleteConfirmation(null);
            toast.success("Product deleted successfully.");
        } catch (error) {
            console.error('Failed to delete product:', error);
            toast.error("Failed to delete product.");
        }
    };

    const handleExportProducts = async () => {
        try {
            const blob = await api.products.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            toast.success("Products exported successfully.");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export products.");
        }
    };

    const handleImportProducts = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await api.products.import(file);
            setImportResult(result);
            loadData();
        } catch (error) {
            console.error("Import failed", error);
            toast.error("Failed to import products. Check JSON format.");
        } finally {
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                        <p className="text-slate-500">Manage products and system settings.</p>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                activeTab === 'products' ? "bg-duagon-blue text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab('articles')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                activeTab === 'articles' ? "bg-duagon-blue text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Articles
                        </button>
                        <button
                            onClick={() => setActiveTab('examples')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                activeTab === 'examples' ? "bg-duagon-blue text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Examples
                        </button>
                        <button
                            onClick={() => setActiveTab('rules')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                activeTab === 'rules' ? "bg-duagon-blue text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Rules
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                activeTab === 'settings' ? "bg-duagon-blue text-white" : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            Settings
                        </button>
                    </div>
                </div>

                {activeTab === 'products' ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">Product Catalog</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleExportProducts}
                                    className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <Download size={18} />
                                    Export
                                </button>
                                <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                                    <Upload size={18} />
                                    Import
                                    <input type="file" accept=".json" className="hidden" onChange={handleImportProducts} />
                                </label>
                                <button
                                    onClick={() => {
                                        setNewProduct({
                                            id: '', type: 'cpu', name: '', description: '', power_watts: 0, width_hp: 4,
                                            price_1: 0, price_25: 0, price_50: 0, price_100: 0, price_250: 0, price_500: 0,
                                            options: '', eol_date: '', height_u: 0, connectors: [], interfaces: [], externalInterfaces: [], image_url: '', url: ''
                                        });
                                        setIsEditing(false);
                                        setIsCreating(true);
                                    }}
                                    className="flex items-center gap-2 bg-duagon-blue text-white px-4 py-2 rounded-lg hover:bg-duagon-blue/90 transition-colors"
                                >
                                    <Plus size={18} />
                                    Add Product
                                </button>
                            </div>
                        </div>

                        {isCreating && (
                            <div ref={formRef} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-lg font-bold mb-4">{isEditing ? 'Edit Product' : 'New Product'}</h3>
                                <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Product number (ID)</label>
                                        <input
                                            required
                                            disabled={isEditing}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                                            value={newProduct.id}
                                            onChange={e => setNewProduct({ ...newProduct, id: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Type</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.type}
                                            onChange={e => setNewProduct({ ...newProduct, type: e.target.value })}
                                        >
                                            <option value="cpu">CPU</option>
                                            <option value="storage">Storage</option>
                                            <option value="network">Network</option>
                                            <option value="io">I/O</option>
                                            <option value="chassis">Chassis</option>
                                            <option value="psu">PSU</option>
                                            <option value="accessory">Accessory</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Name</label>
                                        <input
                                            required
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Description</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.description}
                                            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Image URL</label>
                                        <input
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.image_url}
                                            onChange={e => setNewProduct({ ...newProduct, image_url: e.target.value })}
                                            placeholder="https://example.com/image.png"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Product URL</label>
                                        <input
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.url}
                                            onChange={e => setNewProduct({ ...newProduct, url: e.target.value })}
                                            placeholder="https://www.duagon.com/products/details/..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Power (Watts)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.power_watts}
                                            onChange={e => setNewProduct({ ...newProduct, power_watts: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Width (HP)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.width_hp}
                                            onChange={e => setNewProduct({ ...newProduct, width_hp: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">EOL Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.eol_date}
                                            onChange={e => setNewProduct({ ...newProduct, eol_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Height (U)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newProduct.height_u || ''}
                                            onChange={e => setNewProduct({ ...newProduct, height_u: Number(e.target.value) })}
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Connectors Present</label>
                                        <div className="flex gap-4">
                                            {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(conn => (
                                                <label key={conn} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                        checked={(newProduct.connectors || []).includes(conn)}
                                                        onChange={e => {
                                                            const current = newProduct.connectors || [];
                                                            if (e.target.checked) {
                                                                setNewProduct({ ...newProduct, connectors: [...current, conn].sort() });
                                                            } else {
                                                                setNewProduct({ ...newProduct, connectors: current.filter(c => c !== conn) });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-slate-700">{conn}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-2 border-t pt-4 mt-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-slate-700">Internal Interfaces (Backplane)</label>
                                            <button
                                                type="button"
                                                onClick={() => setNewProduct({
                                                    ...newProduct,
                                                    interfaces: [...newProduct.interfaces, { type: '', count: 1 }]
                                                })}
                                                className="text-xs flex items-center gap-1 text-duagon-blue hover:underline"
                                            >
                                                <Plus size={14} /> Add Interface
                                            </button>
                                        </div>

                                        {newProduct.interfaces.length === 0 && (
                                            <p className="text-xs text-slate-500 italic">No internal interfaces defined.</p>
                                        )}

                                        <div className="space-y-2">
                                            {newProduct.interfaces.map((iface, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <select
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={iface.type}
                                                        onChange={e => {
                                                            const newInterfaces = [...newProduct.interfaces];
                                                            newInterfaces[idx].type = e.target.value;
                                                            setNewProduct({ ...newProduct, interfaces: newInterfaces });
                                                        }}
                                                    >
                                                        <option value="">Select Type...</option>
                                                        <option value="pcie_x1">PCIe x1</option>
                                                        <option value="pcie_x4">PCIe x4</option>
                                                        <option value="pcie_x8">PCIe x8</option>
                                                        <option value="pcie_x16">PCIe x16</option>
                                                        <option value="sata">SATA</option>
                                                        <option value="usb_2">USB 2.0</option>
                                                        <option value="usb_3">USB 3.0</option>
                                                        <option value="ethernet_1g">Ethernet 1G</option>
                                                        <option value="ethernet_10g">Ethernet 10G</option>
                                                        <option value="serial">Serial (UART)</option>
                                                        <option value="gpio">GPIO</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={iface.count}
                                                        onChange={e => {
                                                            const newInterfaces = [...newProduct.interfaces];
                                                            newInterfaces[idx].count = Number(e.target.value);
                                                            setNewProduct({ ...newProduct, interfaces: newInterfaces });
                                                        }}
                                                        placeholder="Count"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newInterfaces = newProduct.interfaces.filter((_, i) => i !== idx);
                                                            setNewProduct({ ...newProduct, interfaces: newInterfaces });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            For CPUs, this defines <strong>capacity</strong> (positive). For peripherals, this defines <strong>consumption</strong> (positive).
                                            The system will subtract peripheral consumption from CPU capacity.
                                        </p>
                                    </div>

                                    <div className="col-span-2 space-y-2 border-t pt-4 mt-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium text-slate-700">External Interfaces (Front/Rear IO)</label>
                                            <button
                                                type="button"
                                                onClick={() => setNewProduct({
                                                    ...newProduct,
                                                    externalInterfaces: [...newProduct.externalInterfaces, { type: '', connector: '', count: 1 }]
                                                })}
                                                className="text-xs flex items-center gap-1 text-duagon-blue hover:underline"
                                            >
                                                <Plus size={14} /> Add External Interface
                                            </button>
                                        </div>

                                        {newProduct.externalInterfaces.length === 0 && (
                                            <p className="text-xs text-slate-500 italic">No external interfaces defined.</p>
                                        )}

                                        <div className="space-y-2">
                                            {newProduct.externalInterfaces.map((iface, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={iface.type}
                                                        onChange={e => {
                                                            const newInterfaces = [...newProduct.externalInterfaces];
                                                            newInterfaces[idx].type = e.target.value;
                                                            setNewProduct({ ...newProduct, externalInterfaces: newInterfaces });
                                                        }}
                                                        placeholder="Type (e.g. Ethernet)"
                                                    />
                                                    <input
                                                        type="text"
                                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={iface.connector}
                                                        onChange={e => {
                                                            const newInterfaces = [...newProduct.externalInterfaces];
                                                            newInterfaces[idx].connector = e.target.value;
                                                            setNewProduct({ ...newProduct, externalInterfaces: newInterfaces });
                                                        }}
                                                        placeholder="Connector (e.g. RJ45)"
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                                        value={iface.count}
                                                        onChange={e => {
                                                            const newInterfaces = [...newProduct.externalInterfaces];
                                                            newInterfaces[idx].count = Number(e.target.value);
                                                            setNewProduct({ ...newProduct, externalInterfaces: newInterfaces });
                                                        }}
                                                        placeholder="Count"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newInterfaces = newProduct.externalInterfaces.filter((_, i) => i !== idx);
                                                            setNewProduct({ ...newProduct, externalInterfaces: newInterfaces });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 grid grid-cols-3 gap-4 border-t pt-4 mt-2">
                                        <h4 className="col-span-3 font-medium text-slate-700">Tiered Pricing (€)</h4>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">1+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_1} onChange={e => setNewProduct({ ...newProduct, price_1: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">25+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_25} onChange={e => setNewProduct({ ...newProduct, price_25: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">50+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_50} onChange={e => setNewProduct({ ...newProduct, price_50: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">100+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_100} onChange={e => setNewProduct({ ...newProduct, price_100: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">250+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_250} onChange={e => setNewProduct({ ...newProduct, price_250: Number(e.target.value) })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500">500+ Qty</label>
                                            <input type="number" className="w-full px-3 py-2 border rounded-lg" value={newProduct.price_500} onChange={e => setNewProduct({ ...newProduct, price_500: Number(e.target.value) })} />
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-2 border-t pt-4 mt-2">
                                        <label className="text-sm font-medium">Configuration Options (JSON)</label>
                                        <textarea
                                            className="w-full px-3 py-2 border rounded-lg font-mono text-xs h-32"
                                            value={newProduct.options}
                                            onChange={e => setNewProduct({ ...newProduct, options: e.target.value })}
                                            placeholder='[{"id": "ram", "label": "Memory", "type": "select", "choices": [{"value": "16GB", "eol_date": "2028-12-31"}]}]'
                                        />
                                        <p className="text-xs text-slate-500">Enter valid JSON for product options.</p>
                                    </div>

                                    <div className="col-span-2 flex justify-end gap-2 mt-4">
                                        <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-duagon-blue text-white rounded-lg hover:bg-duagon-blue/90">
                                            {isEditing ? 'Update Product' : 'Create Product'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Product ID</th>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Type</th>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Name</th>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Power</th>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Price (1+)</th>
                                        <th className="px-6 py-3 text-sm font-medium text-slate-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                    ) : products.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No products found.</td></tr>
                                    ) : (
                                        products.map(product => (
                                            <tr key={product.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 font-mono text-sm">{product.id}</td>
                                                <td className="px-6 py-4 text-sm capitalize">{product.type}</td>
                                                <td className="px-6 py-4 text-sm font-medium">{product.name}</td>
                                                <td className="px-6 py-4 text-sm">{product.power_watts || product.powerWatts}W</td>
                                                <td className="px-6 py-4 text-sm">€{product.price1}</td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    <button
                                                        onClick={() => handleEditProduct(product)}
                                                        className="p-1 text-duagon-blue hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Edit Product"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmation({ id: product.id, name: product.name })}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Product"
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
                    </div>
                ) : activeTab === 'settings' ? (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">System Settings</h2>
                        <div className="max-w-md space-y-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Central Quote Email Address
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={settings['central_email'] || ''}
                                        onChange={(e) => setSettings({ ...settings, 'central_email': e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                    <button
                                        onClick={() => handleSaveSetting('central_email', settings['central_email'])}
                                        className="px-4 py-2 bg-duagon-blue text-white rounded-lg hover:bg-duagon-blue/90 font-medium"
                                    >
                                        Save
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    All quote requests will be sent to this address in addition to the requester.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'rules' ? (
                    <RulesManager />
                ) : activeTab === 'examples' ? (
                    <ExamplesManager />
                ) : (
                    <ArticlesManager />
                )}
            </div>

            {/* Delete Confirmation Modal for Products */}
            <SubConfigModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onSave={() => deleteConfirmation && handleDeleteProduct(deleteConfirmation.id)}

                title="Confirm Deletion"
                saveLabel="Delete"
                saveButtonClass="bg-red-600 hover:bg-red-700"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete <strong>{deleteConfirmation?.name}</strong>? This action cannot be undone.
                    </p>
                </div>
            </SubConfigModal>

            {/* Import Result Modal */}
            <SubConfigModal
                isOpen={!!importResult}
                onClose={() => setImportResult(null)}
                onSave={() => setImportResult(null)}
                title="Import Successful"
                saveLabel="OK"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-green-600 bg-green-50 p-4 rounded-lg">
                        <div className="bg-green-100 p-2 rounded-full">
                            <Upload size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold">Import Complete</h4>
                            <p className="text-sm text-green-800">The product data has been successfully imported.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
                            <div className="text-3xl font-bold text-slate-900">{importResult?.added}</div>
                            <div className="text-sm text-slate-500 font-medium">New Products Added</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
                            <div className="text-3xl font-bold text-slate-900">{importResult?.updated}</div>
                            <div className="text-sm text-slate-500 font-medium">Products Updated</div>
                        </div>
                    </div>
                </div>
            </SubConfigModal>
        </div>
    );
}

function RulesManager() {
    const [rules, setRules] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newRule, setNewRule] = useState({
        id: 0,
        description: '',
        definition: JSON.stringify({
            conditions: [],
            actions: []
        }, null, 2)
    });

    const [isEditing, setIsEditing] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number, description: string } | null>(null); // For rules
    const toast = useToast();

    const loadRules = async () => {
        setIsLoading(true);
        try {
            const data = await api.rules.list();
            setRules(data);
        } catch (error) {
            console.error("Failed to load rules", error);
            toast.error("Failed to load rules.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    const handleSaveRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate JSON
            const definition = JSON.parse(newRule.definition);

            const ruleData = {
                description: newRule.description,
                definition: definition
            };

            if (isEditing) {
                await api.rules.update(newRule.id, ruleData);
                toast.success("Rule updated successfully.");
            } else {
                await api.rules.create(ruleData);
                toast.success("Rule created successfully.");
            }

            setIsCreating(false);
            setIsEditing(false);
            loadRules();
            setNewRule({
                id: 0,
                description: '',
                definition: JSON.stringify({ conditions: [], actions: [] }, null, 2)
            });
        } catch (error) {
            console.error("Failed to save rule", error);
            toast.error("Invalid JSON definition or server error.");
        }
    };

    const handleEditRule = (rule: any) => {
        setNewRule({
            id: rule.id,
            description: rule.description,
            definition: JSON.stringify(rule.definition, null, 2)
        });
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDeleteRule = async (id: number) => {
        try {
            await api.rules.delete(id);
            loadRules();
            setDeleteConfirmation(null);
            toast.success("Rule deleted successfully.");
        } catch (error) {
            console.error('Failed to delete rule:', error);
            toast.error("Failed to delete rule.");
        }
    };

    const handleExportRules = async () => {
        try {
            const blob = await api.rules.export();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rules_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
            toast.success("Rules exported successfully.");
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export rules.");
        }
    };

    const handleImportRules = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const result = await api.rules.import(file);
            toast.success(`Imported: ${result.added} added, ${result.updated} updated.`);
            loadRules();
        } catch (error) {
            console.error("Import failed", error);
            toast.error("Failed to import rules. Check JSON format.");
        } finally {
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Configuration Rules</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportRules}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download size={18} />
                        Export
                    </button>
                    <label className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                        <Upload size={18} />
                        Import
                        <input type="file" accept=".json" className="hidden" onChange={handleImportRules} />
                    </label>
                    <button
                        onClick={() => {
                            setNewRule({
                                id: 0,
                                description: '',
                                definition: JSON.stringify({ conditions: [], actions: [] }, null, 2)
                            });
                            setIsEditing(false);
                            setIsCreating(true);
                        }}
                        className="flex items-center gap-2 bg-duagon-blue text-white px-4 py-2 rounded-lg hover:bg-duagon-blue/90 transition-colors"
                    >
                        <Plus size={18} />
                        Add Rule
                    </button>
                </div>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-lg font-bold mb-4">{isEditing ? 'Edit Rule' : 'New Rule'}</h3>
                    <form onSubmit={handleSaveRule} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <input
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newRule.description}
                                onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                                placeholder="e.g. If G28 in slot 1, no G239 in slot 2"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Rule Definition (JSON)</label>
                            <textarea
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs h-64"
                                value={newRule.definition}
                                onChange={e => setNewRule({ ...newRule, definition: e.target.value })}
                            />
                            <p className="text-xs text-slate-500">
                                Define conditions and actions in JSON format.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-duagon-blue text-white rounded-lg hover:bg-duagon-blue/90">
                                {isEditing ? 'Update Rule' : 'Create Rule'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">ID</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Description</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Definition</th>
                            <th className="px-6 py-3 text-sm font-medium text-slate-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No rules found.</td></tr>
                        ) : (
                            rules.map(rule => (
                                <tr key={rule.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-sm">{rule.id}</td>
                                    <td className="px-6 py-4 text-sm">{rule.description}</td>
                                    <td className="px-6 py-4 text-sm font-mono text-xs text-slate-500 truncate max-w-md">
                                        {JSON.stringify(rule.definition)}
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button
                                            onClick={() => handleEditRule(rule)}
                                            className="p-1 text-duagon-blue hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit Rule"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmation({ id: rule.id, description: rule.description })}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Rule"
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


            {/* Delete Confirmation Modal for Rules */}
            <SubConfigModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onSave={() => deleteConfirmation && handleDeleteRule(deleteConfirmation.id)}
                title="Confirm Deletion"
                saveLabel="Delete"
                saveButtonClass="bg-red-600 hover:bg-red-700"
            >
                <div className="space-y-4">
                    <p className="text-slate-600">
                        Are you sure you want to delete this rule? This action cannot be undone.
                    </p>
                    <p className="font-medium text-slate-900">{deleteConfirmation?.description}</p>
                </div>
            </SubConfigModal>
        </div >
    );
}
