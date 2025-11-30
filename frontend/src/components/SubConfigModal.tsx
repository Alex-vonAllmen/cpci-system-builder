import { X } from 'lucide-react';

interface SubConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (options: any) => void;
    title: string;
    children: React.ReactNode;
}

export function SubConfigModal({ isOpen, onClose, onSave, title, children }: SubConfigModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({})} // Placeholder for actual form data
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}
