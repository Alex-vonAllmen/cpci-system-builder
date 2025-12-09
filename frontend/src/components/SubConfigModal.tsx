import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SubConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (data: any) => void;
    onRemove?: () => void;
    title?: string;
    children?: React.ReactNode;
    saveLabel?: string;
    saveButtonClass?: string;
}

export function SubConfigModal({ isOpen, onClose, onSave, onRemove, title, children, saveLabel, saveButtonClass }: SubConfigModalProps) {
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
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="mr-auto px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            Remove
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave?.({})} // Placeholder for actual form data
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors",
                            saveButtonClass || "bg-duagon-blue hover:bg-duagon-blue/90"
                        )}
                    >
                        {saveLabel || "Save Configuration"}
                    </button>
                </div>
            </div>
        </div>
    );
}
