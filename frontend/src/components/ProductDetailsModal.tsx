import { X, ExternalLink } from 'lucide-react';
import type { Product } from '../data/mockProducts';

interface ProductDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900">Product Details</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <h4 className="font-bold text-xl text-slate-900 mb-1">{product.name}</h4>
                        <p className="text-sm text-slate-500">{product.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 uppercase font-semibold">Width</span>
                            <span className="font-bold text-slate-900">{product.widthHp} HP</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="block text-xs text-slate-500 uppercase font-semibold">Power</span>
                            <span className="font-bold text-slate-900">{product.powerWatts} W</span>
                        </div>
                    </div>

                    {product.interfaces && (
                        <div>
                            <h5 className="font-bold text-slate-900 mb-2 text-sm">Internal Interfaces</h5>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(product.interfaces).map(([key, val]) => (
                                    <div key={key} className="bg-blue-50 p-2 rounded border border-blue-100 flex justify-between items-center">
                                        <span className="text-xs text-blue-700 uppercase font-semibold">{key.replace('_', ' ')}</span>
                                        <span className="font-bold text-blue-900">{val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.connectors && product.connectors.length > 0 && (
                        <div>
                            <h5 className="font-bold text-slate-900 mb-2 text-sm">Connectors</h5>
                            <div className="flex flex-wrap gap-2">
                                {product.connectors.map(c => (
                                    <span key={c} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono border border-slate-200">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {product.url && (
                        <div className="pt-4 border-t border-slate-100">
                            <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-duagon-blue hover:underline text-sm font-medium"
                            >
                                <ExternalLink size={16} />
                                View Full Specifications
                            </a>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
